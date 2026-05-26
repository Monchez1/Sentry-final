from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import DateTime

from datetime import datetime

from database.base import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)

    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )

    event_type = Column(
        String,
        nullable=False
    )

    severity = Column(
        String,
        default="INFO"
    )

    message = Column(
        String,
        nullable=False
    )

    telegram_id = Column(
        String,
        index=True,
        nullable=True
    )

