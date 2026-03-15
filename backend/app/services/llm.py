"""
LLM provider — uses GPT-OSS 120B hosted endpoint.
Falls back to rule-based analysis + canned tutor response if the endpoint is unavailable.
"""

import json
import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client — GPT-OSS 120B hosted on HuggingFace (OpenAI-compatible API)
# ---------------------------------------------------------------------------
_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.LLM_BASE_URL,
)

_MODEL = settings.LLM_MODEL

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------
_TUTOR_SYSTEM = """You are a helpful AI tutor embedded in a university course.
Your job is to help students understand concepts — not to give them direct answers to homework.

Formatting rules (strictly follow these):
- Use markdown: headings (##, ###), **bold**, bullet lists, numbered lists, tables
- For math, use LaTeX: inline with $...$ and block with $$...$$
- NEVER use <br> tags inside table cells — use a new bullet list outside the table instead
- NEVER use HTML tags of any kind
- Keep table cells short and clean — move detailed content to bullet lists below the table
- Be patient, encouraging, and clear
- Keep responses under 400 words unless a detailed explanation is truly needed"""

_ANALYSIS_SYSTEM = """You are an educational analytics AI. Analyze student messages and return structured JSON only.
Never include markdown, code fences, or any text outside the JSON object."""

_ANALYSIS_PROMPT = """Analyze this student message and return exactly this JSON structure:
{{
  "primary_topic": "main academic topic (e.g. probability, calculus, algebra)",
  "subtopic": "specific subtopic (e.g. bayes_theorem, chain_rule)",
  "confusion_score": <float 0.0-1.0, how confused the student seems>,
  "frustration_score": <float 0.0-1.0, how frustrated>,
  "intent_type": "<one of: concept_explanation | example_request | homework_help | direct_answer_request | test_preparation | general>",
  "conceptual_vs_procedural": "<one of: conceptual | procedural | both | unclear>",
  "direct_answer_request_likelihood": <float 0.0-1.0>,
  "homework_help_likelihood": <float 0.0-1.0>
}}

Student message: "{message}"
Course subject: {subject}

Return ONLY the JSON object, nothing else."""


# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------
@dataclass
class AnalysisResult:
    primary_topic: str | None = None
    subtopic: str | None = None
    confusion_score: float | None = None
    frustration_score: float | None = None
    intent_type: str | None = None
    conceptual_vs_procedural: str | None = None
    direct_answer_request_likelihood: float | None = None
    homework_help_likelihood: float | None = None


# ---------------------------------------------------------------------------
# Tutor response
# ---------------------------------------------------------------------------
async def generate_response(messages: list[dict]) -> str:
    """Call GPT-OSS 120B; fall back to a static response if unavailable.
    This is a reasoning model — it uses a large token budget for chain-of-thought,
    then emits the final answer in message.content."""
    try:
        resp = await _client.chat.completions.create(
            model=_MODEL,
            messages=[{"role": "system", "content": _TUTOR_SYSTEM}, *messages],
            max_tokens=2048,  # reasoning model needs room to think before answering
            temperature=0.7,
        )
        choice = resp.choices[0]
        content = choice.message.content or ""
        # Some reasoning model builds emit final text in 'reasoning' when content is empty
        if not content.strip():
            reasoning = getattr(choice.message, "reasoning", None) or ""
            # Extract last paragraph of reasoning as the response (rough heuristic)
            if reasoning.strip():
                paragraphs = [p.strip() for p in reasoning.strip().split("\n") if p.strip()]
                content = paragraphs[-1] if paragraphs else reasoning[:500]
        if content.strip():
            return content.strip()
        raise ValueError("Empty response from model")
    except Exception as e:
        logger.warning(f"LLM tutor call failed ({type(e).__name__}): {e}")
        return _fallback_tutor_response(messages)


# ---------------------------------------------------------------------------
# Analysis pipeline
# ---------------------------------------------------------------------------
async def analyze_message(message_content: str, subject: str = "general") -> AnalysisResult:
    """Analyze a student message for topic, confusion, intent.
    Falls back to rule-based analysis if the endpoint is unavailable."""
    try:
        prompt = _ANALYSIS_PROMPT.format(message=message_content, subject=subject)
        resp = await _client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": _ANALYSIS_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,  # reasoning model needs tokens to think before outputting JSON
            temperature=0.1,
        )
        choice = resp.choices[0]
        raw = (choice.message.content or "").strip()
        # If content is empty, try extracting JSON from reasoning output
        if not raw:
            reasoning = getattr(choice.message, "reasoning", None) or ""
            import re
            json_match = re.search(r'\{[^{}]+\}', reasoning, re.DOTALL)
            if json_match:
                raw = json_match.group(0)
        # Strip accidental markdown fences if model includes them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return AnalysisResult(
            primary_topic=data.get("primary_topic"),
            subtopic=data.get("subtopic"),
            confusion_score=_clamp(data.get("confusion_score")),
            frustration_score=_clamp(data.get("frustration_score")),
            intent_type=_valid_intent(data.get("intent_type")),
            conceptual_vs_procedural=_valid_cp(data.get("conceptual_vs_procedural")),
            direct_answer_request_likelihood=_clamp(data.get("direct_answer_request_likelihood")),
            homework_help_likelihood=_clamp(data.get("homework_help_likelihood")),
        )
    except Exception as e:
        logger.warning(f"LLM analysis call failed ({type(e).__name__}): {e}")
        return _fallback_analysis(message_content)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _clamp(val) -> float | None:
    if val is None:
        return None
    try:
        return round(max(0.0, min(1.0, float(val))), 3)
    except (TypeError, ValueError):
        return None


_VALID_INTENTS = {
    "concept_explanation", "example_request", "homework_help",
    "direct_answer_request", "test_preparation", "general",
}

_VALID_CP = {"conceptual", "procedural", "both", "unclear"}


def _valid_intent(val: str | None) -> str | None:
    return val if val in _VALID_INTENTS else "general"


def _valid_cp(val: str | None) -> str | None:
    return val if val in _VALID_CP else "unclear"


# ---------------------------------------------------------------------------
# Fallbacks — used when the hosted endpoint is down
# ---------------------------------------------------------------------------
def _fallback_tutor_response(messages: list[dict]) -> str:
    """Rule-based tutor reply based on the last user message."""
    last = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
    ).lower()

    if any(w in last for w in ["give me the answer", "just tell me", "what is the answer"]):
        return (
            "I understand you're looking for the answer, but working through it yourself "
            "will help it stick. Let's break it down step by step — what part are you "
            "most unsure about?"
        )
    if any(w in last for w in ["bayes", "posterior", "prior", "likelihood"]):
        return (
            "Bayes' theorem relates the probability of a hypothesis given evidence: "
            "P(H|E) = P(E|H) × P(H) / P(E). The key insight is that we update our "
            "prior belief P(H) using the likelihood P(E|H) to get the posterior P(H|E). "
            "Would you like a worked example with numbers?"
        )
    if any(w in last for w in ["p-value", "hypothesis", "null", "significance"]):
        return (
            "A p-value measures how likely you'd see your data if the null hypothesis "
            "were true. A small p-value (typically < 0.05) suggests the data is unlikely "
            "under the null, giving you evidence to reject it. What specific aspect would "
            "you like me to clarify?"
        )
    if any(w in last for w in ["confidence interval", "margin of error"]):
        return (
            "A confidence interval gives a range of plausible values for a population "
            "parameter. A 95% CI means: if we repeated this process many times, 95% of "
            "the intervals we construct would contain the true value. "
            "What would you like to explore further?"
        )
    return (
        "That's a great question! Let me help you work through it. "
        "Could you share what you already understand about the topic? "
        "That way I can build on what you know and address the specific gap."
    )


def _fallback_analysis(message: str) -> AnalysisResult:
    """Rule-based analysis when the hosted endpoint is unavailable."""
    msg = message.lower()

    # Intent detection
    if any(w in msg for w in ["give me the answer", "what is the answer", "just tell me", "solve this for me"]):
        intent = "direct_answer_request"
        direct_likelihood = 0.92
        hw_likelihood = 0.75
    elif any(w in msg for w in ["show me an example", "example of", "demonstrate"]):
        intent = "example_request"
        direct_likelihood = 0.1
        hw_likelihood = 0.2
    elif any(w in msg for w in ["homework", "assignment", "problem set", "worksheet"]):
        intent = "homework_help"
        direct_likelihood = 0.4
        hw_likelihood = 0.88
    elif any(w in msg for w in ["explain", "what is", "why does", "how does", "understand", "what does"]):
        intent = "concept_explanation"
        direct_likelihood = 0.05
        hw_likelihood = 0.15
    elif any(w in msg for w in ["exam", "test", "quiz", "study", "midterm", "final"]):
        intent = "test_preparation"
        direct_likelihood = 0.2
        hw_likelihood = 0.3
    else:
        intent = "general"
        direct_likelihood = 0.1
        hw_likelihood = 0.2

    # Confusion score
    high_confusion = any(w in msg for w in ["confused", "don't understand", "lost", "stuck", "no idea", "what even"])
    low_confusion = any(w in msg for w in ["just want", "quick question", "simple"])
    confusion = 0.75 if high_confusion else (0.2 if low_confusion else 0.45)

    # Frustration score
    frustration = 0.75 if any(w in msg for w in ["frustrated", "hate", "impossible", "never get", "so hard", "ugh"]) else 0.2

    # Topic detection
    topic_map = {
        "bayes": ("probability", "bayes_theorem"),
        "conditional": ("probability", "conditional_probability"),
        "hypothesis": ("statistics", "hypothesis_testing"),
        "p-value": ("statistics", "hypothesis_testing"),
        "confidence interval": ("statistics", "confidence_intervals"),
        "normal distribution": ("statistics", "normal_distribution"),
        "z-score": ("statistics", "normal_distribution"),
        "regression": ("statistics", "regression"),
        "correlation": ("statistics", "correlation"),
        "derivative": ("calculus", "differentiation"),
        "integral": ("calculus", "integration"),
        "matrix": ("linear_algebra", "matrices"),
        "eigenvalue": ("linear_algebra", "eigenvalues"),
    }
    primary_topic, subtopic = "general", None
    for keyword, (topic, sub) in topic_map.items():
        if keyword in msg:
            primary_topic, subtopic = topic, sub
            break

    # Conceptual vs procedural
    if any(w in msg for w in ["why", "what is", "explain", "understand", "mean"]):
        cp = "conceptual"
    elif any(w in msg for w in ["how to", "steps", "calculate", "compute", "solve"]):
        cp = "procedural"
    else:
        cp = "unclear"

    return AnalysisResult(
        primary_topic=primary_topic,
        subtopic=subtopic,
        confusion_score=confusion,
        frustration_score=frustration,
        intent_type=intent,
        conceptual_vs_procedural=cp,
        direct_answer_request_likelihood=direct_likelihood,
        homework_help_likelihood=hw_likelihood,
    )
