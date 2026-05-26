from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database.base import Base

class RotatorState(Base):
    """Stores the latest pushed snapshot from the local rotator process."""
    __tablename__ = "rotator_state"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, nullable=True, index=True)
    snapshot_json = Column(Text, nullable=False)   # full JSON blob
    signals_json = Column(Text, nullable=True)     # pending_signals JSON blob
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
