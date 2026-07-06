from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class FeedbackRaw(Base):
    __tablename__ = "feedback_raw"

    id = Column(Integer, primary_key=True, index=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    zone = Column(String, index=True)
    category_reported = Column(String, nullable=True)
    description = Column(Text)
    source = Column(String, default="app")  # app | call | social
    status = Column(String, default="new")  # new | reviewed | resolved

    processed = relationship("FeedbackProcessed", back_populates="raw", uselist=False)


class FeedbackProcessed(Base):
    __tablename__ = "feedback_processed"

    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(Integer, ForeignKey("feedback_raw.id"), unique=True)
    category_ai = Column(String)
    sentiment = Column(String)  # negative | neutral | positive
    urgency_score = Column(Integer)  # 1-10
    priority_score = Column(Float)
    reasoning = Column(Text, nullable=True)
    processed_at = Column(DateTime, default=datetime.utcnow)

    raw = relationship("FeedbackRaw", back_populates="processed")


class ZoneDailyAggregate(Base):
    __tablename__ = "zone_daily_aggregates"

    id = Column(Integer, primary_key=True, index=True)
    zone = Column(String, index=True)
    date = Column(Date, index=True)
    category = Column(String)
    count = Column(Integer, default=0)
    avg_urgency = Column(Float, default=0.0)
