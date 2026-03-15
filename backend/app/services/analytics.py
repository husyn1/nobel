"""Analytics engine — aggregates AIAnalysis rows into course-level insights."""

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.analysis import AIAnalysis
from app.models.conversation import Conversation, Message
from app.models.course import Course
from app.schemas.analytics import (
    CourseAnalytics,
    DailyConfusion,
    IntentBreakdown,
    OverviewStats,
    SampleQuestion,
    TopicStat,
)

logger = logging.getLogger(__name__)


def get_course_analytics(db: Session, course_id: UUID) -> CourseAnalytics:
    # Base query: messages in this course that have analysis
    student_messages = (
        db.query(Message, AIAnalysis, Conversation)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .join(AIAnalysis, AIAnalysis.message_id == Message.id)
        .filter(Conversation.course_id == course_id)
        .filter(Message.role == "student")
        .all()
    )

    if not student_messages:
        return _empty_analytics()

    total = len(student_messages)

    # --- Overview ---
    confusion_scores = [a.confusion_score for _, a, _ in student_messages if a.confusion_score is not None]
    avg_confusion = round(sum(confusion_scores) / len(confusion_scores), 2) if confusion_scores else 0.0

    direct_requests = sum(
        1 for _, a, _ in student_messages if a.intent_type == "direct_answer_request"
    )
    direct_pct = round(direct_requests / total * 100, 1)

    active_students = len({c.student_id for _, _, c in student_messages})
    total_convs = len({m.conversation_id for m, _, _ in student_messages})

    overview = OverviewStats(
        total_questions=total,
        avg_confusion=avg_confusion,
        direct_answer_pct=direct_pct,
        active_students=active_students,
        total_conversations=total_convs,
    )

    # --- Top confusing topics ---
    topic_data: dict[str, dict] = defaultdict(lambda: {"confusion": [], "count": 0, "subtopics": []})
    for _, a, _ in student_messages:
        if a.primary_topic:
            key = a.primary_topic
            topic_data[key]["count"] += 1
            if a.confusion_score is not None:
                topic_data[key]["confusion"].append(a.confusion_score)
            if a.subtopic:
                topic_data[key]["subtopics"].append(a.subtopic)

    top_topics = []
    for topic, data in topic_data.items():
        avg_c = round(sum(data["confusion"]) / len(data["confusion"]), 2) if data["confusion"] else 0.0
        subtopic = _most_common(data["subtopics"])
        top_topics.append(TopicStat(
            topic=topic,
            subtopic=subtopic,
            avg_confusion=avg_c,
            question_count=data["count"],
        ))
    top_topics.sort(key=lambda x: x.avg_confusion, reverse=True)
    top_topics = top_topics[:8]

    # --- Intent breakdown ---
    intent_counts: dict[str, int] = defaultdict(int)
    for _, a, _ in student_messages:
        if a.intent_type:
            intent_counts[a.intent_type] += 1

    def pct(key: str) -> float:
        return round(intent_counts.get(key, 0) / total * 100, 1)

    intent_breakdown = IntentBreakdown(
        concept_explanation=pct("concept_explanation"),
        example_request=pct("example_request"),
        homework_help=pct("homework_help"),
        direct_answer_request=pct("direct_answer_request"),
        test_preparation=pct("test_preparation"),
        general=pct("general"),
    )

    # --- Confusion trend (last 14 days) ---
    daily: dict[str, list[float]] = defaultdict(list)
    for m, a, _ in student_messages:
        if a.confusion_score is not None:
            day = m.created_at.strftime("%Y-%m-%d")
            daily[day].append(a.confusion_score)

    trend = []
    for day in sorted(daily.keys())[-14:]:
        scores = daily[day]
        trend.append(DailyConfusion(
            date=day,
            avg_confusion=round(sum(scores) / len(scores), 2),
            question_count=len(scores),
        ))

    # --- Sample questions (highest confusion, unique) ---
    sorted_by_confusion = sorted(
        [(m, a) for m, a, _ in student_messages if a.confusion_score and a.confusion_score > 0.5],
        key=lambda x: x[1].confusion_score,
        reverse=True,
    )
    seen_content = set()
    samples = []
    for m, a in sorted_by_confusion[:20]:
        snippet = m.content[:120]
        if snippet not in seen_content:
            seen_content.add(snippet)
            samples.append(SampleQuestion(
                content=m.content[:200],
                topic=a.primary_topic,
                subtopic=a.subtopic,
                intent_type=a.intent_type,
            ))
        if len(samples) >= 6:
            break

    # --- Natural language insight summary ---
    insight = _generate_insight_summary(overview, top_topics, intent_breakdown, trend)

    return CourseAnalytics(
        overview=overview,
        top_confusing_topics=top_topics,
        intent_breakdown=intent_breakdown,
        confusion_trend=trend,
        sample_questions=samples,
        insight_summary=insight,
    )


def _generate_insight_summary(
    overview: OverviewStats,
    topics: list[TopicStat],
    intents: IntentBreakdown,
    trend: list[DailyConfusion],
) -> str:
    lines = []

    if topics:
        top = topics[0]
        lines.append(
            f"Students are most confused about **{top.topic.replace('_', ' ').title()}**"
            + (f" — specifically {top.subtopic.replace('_', ' ')}" if top.subtopic else "")
            + f" (avg confusion: {top.avg_confusion:.0%})."
        )

    if overview.avg_confusion > 0.6:
        lines.append("Overall confusion levels are **high** across the class.")
    elif overview.avg_confusion > 0.4:
        lines.append("Overall confusion is at a **moderate** level.")
    else:
        lines.append("Overall confusion levels are relatively **low** — students appear to be coping well.")

    if intents.direct_answer_request > 20:
        lines.append(
            f"A notable {intents.direct_answer_request:.0f}% of questions are direct answer requests, "
            "which may indicate students are seeking shortcuts rather than understanding."
        )

    if intents.concept_explanation > 40:
        lines.append(
            "Most student questions are conceptual — students want to understand the 'why', "
            "not just the 'how'."
        )

    if trend and len(trend) >= 3:
        recent = trend[-3:]
        if recent[-1].avg_confusion > recent[0].avg_confusion + 0.1:
            lines.append("⚠️ Confusion has been **increasing** over the past few days — consider a review session.")
        elif recent[-1].avg_confusion < recent[0].avg_confusion - 0.1:
            lines.append("Confusion appears to be **decreasing** — recent instruction may be helping.")

    if intents.concept_explanation > intents.homework_help:
        lines.append(
            "\n**Recommendation:** Focus review sessions on conceptual understanding. "
            "Use worked examples and encourage students to explain concepts in their own words."
        )
    else:
        lines.append(
            "\n**Recommendation:** Students appear to struggle with applying concepts to problems. "
            "Provide step-by-step procedural walkthroughs with annotated examples."
        )

    return " ".join(lines) if lines else "Not enough data to generate insights yet."


def _empty_analytics() -> CourseAnalytics:
    return CourseAnalytics(
        overview=OverviewStats(
            total_questions=0,
            avg_confusion=0.0,
            direct_answer_pct=0.0,
            active_students=0,
            total_conversations=0,
        ),
        top_confusing_topics=[],
        intent_breakdown=IntentBreakdown(
            concept_explanation=0,
            example_request=0,
            homework_help=0,
            direct_answer_request=0,
            test_preparation=0,
            general=0,
        ),
        confusion_trend=[],
        sample_questions=[],
        insight_summary="No student questions have been recorded yet.",
    )


def _most_common(lst: list) -> str | None:
    if not lst:
        return None
    return max(set(lst), key=lst.count)
