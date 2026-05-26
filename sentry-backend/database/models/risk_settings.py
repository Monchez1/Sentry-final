from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import Boolean
from sqlalchemy import String

from database.base import Base

class RiskSettings(Base):
    __tablename__ = "risk_settings"

    id = Column(Integer, primary_key=True)

    max_daily_drawdown = Column(Float, default=0.10)

    max_open_risk = Column(Float, default=0.06)

    max_consecutive_losses = Column(Integer, default=3)

    emergency_stop_pct = Column(Float, default=0.20)

    circuit_breaker_enabled = Column(Boolean, default=True)

    circuit_breaker_cooldown_scans = Column(Integer, default=15)

    telegram_id = Column(String, unique=True, index=True, nullable=True)


