from pydantic import BaseModel


class TopicStat(BaseModel):
    topic: str
    subtopic: str | None
    avg_confusion: float
    question_count: int


class IntentBreakdown(BaseModel):
    concept_explanation: float
    example_request: float
    homework_help: float
    direct_answer_request: float
    test_preparation: float
    general: float


class DailyConfusion(BaseModel):
    date: str
    avg_confusion: float
    question_count: int


class SampleQuestion(BaseModel):
    content: str
    topic: str | None
    subtopic: str | None
    intent_type: str | None


class OverviewStats(BaseModel):
    total_questions: int
    avg_confusion: float
    direct_answer_pct: float
    active_students: int
    total_conversations: int


class CourseAnalytics(BaseModel):
    overview: OverviewStats
    top_confusing_topics: list[TopicStat]
    intent_breakdown: IntentBreakdown
    confusion_trend: list[DailyConfusion]
    sample_questions: list[SampleQuestion]
    insight_summary: str
