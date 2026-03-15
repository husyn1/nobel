import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_student
from app.database import get_db
from app.models.analysis import AIAnalysis
from app.models.conversation import Conversation, Message
from app.models.course import Course, CourseEnrollment
from app.models.user import Student
from app.schemas.conversation import ChatRequest, ChatResponse, ConversationOut, MessageOut
from app.services.llm import analyze_message, generate_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/{course_id}", response_model=ChatResponse)
async def send_message(
    course_id: str,
    body: ChatRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    # Verify enrollment
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrolled = (
        db.query(CourseEnrollment)
        .filter(CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == student.id)
        .first()
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    # Get or create conversation
    if body.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == body.conversation_id, Conversation.student_id == student.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            course_id=course_id,
            student_id=student.id,
            title=body.message[:60],
        )
        db.add(conversation)
        db.flush()

    # Store student message
    student_msg = Message(
        conversation_id=conversation.id,
        role="student",
        content=body.message,
    )
    db.add(student_msg)
    db.flush()

    # Build message history for LLM
    history_rows = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
        .limit(20)
        .all()
    )
    history = [
        {"role": "user" if m.role == "student" else "assistant", "content": m.content}
        for m in history_rows
    ]

    # Run LLM + analysis in parallel
    tutor_task = generate_response(history)
    analysis_task = analyze_message(body.message, subject=course.subject or "general")
    tutor_reply, analysis_result = await asyncio.gather(tutor_task, analysis_task)

    # Store AI reply
    ai_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=tutor_reply,
    )
    db.add(ai_msg)
    db.flush()

    # Store analysis
    analysis = AIAnalysis(
        message_id=student_msg.id,
        primary_topic=analysis_result.primary_topic,
        subtopic=analysis_result.subtopic,
        confusion_score=analysis_result.confusion_score,
        frustration_score=analysis_result.frustration_score,
        intent_type=analysis_result.intent_type,
        conceptual_vs_procedural=analysis_result.conceptual_vs_procedural,
        direct_answer_request_likelihood=analysis_result.direct_answer_request_likelihood,
        homework_help_likelihood=analysis_result.homework_help_likelihood,
    )
    db.add(analysis)
    db.commit()
    db.refresh(student_msg)
    db.refresh(ai_msg)

    return ChatResponse(
        conversation_id=conversation.id,
        message=MessageOut.model_validate(student_msg),
        reply=MessageOut.model_validate(ai_msg),
    )


@router.get("/{course_id}/conversations", response_model=list[ConversationOut])
def list_conversations(
    course_id: str,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return (
        db.query(Conversation)
        .filter(Conversation.course_id == course_id, Conversation.student_id == student.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


@router.get("/conversation/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: str,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.student_id == student.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv
