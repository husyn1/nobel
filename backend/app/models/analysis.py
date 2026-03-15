import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String(36), ForeignKey("messages.id"), unique=True, nullable=False)

    primary_topic = Column(String, nullable=True)
    subtopic = Column(String, nullable=True)

    confusion_score = Column(Float, nullable=True)
    frustration_score = Column(Float, nullable=True)

    intent_type = Column(String, nullable=True)
    conceptual_vs_procedural = Column(String, nullable=True)

    direct_answer_request_likelihood = Column(Float, nullable=True)
    homework_help_likelihood = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="analysis")
