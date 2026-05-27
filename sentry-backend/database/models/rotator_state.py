from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database.base import Base

class RotatorState(Base):
    """Stores the latest pushed snapshot from the rotator process (local or cloud)."""
    __tablename__ = "rotator_state"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, nullable=True, index=True)
    snapshot_json = Column(Text, nullable=False)   # full JSON blob
    signals_json = Column(Text, nullable=True)     # pending_signals JSON blob
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # Cloud control: API writes a command here; worker reads + clears it each loop
    control = Column(String, nullable=True)        # "stop"|"pause"|"resume"|"exit_all"|"rebalance"|"reset_balance"

