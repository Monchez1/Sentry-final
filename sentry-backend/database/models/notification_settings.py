from sqlalchemy import Column, Integer, Boolean, String
from database.base import Base

class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    trade_executions = Column(Boolean, default=True)
    daily_reports = Column(Boolean, default=True)
    system_outages = Column(Boolean, default=True)
    cooldown_locks = Column(Boolean, default=True)
