from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import DateTime

from datetime import datetime

from database.base import Base

class TradeHistory(Base):
    __tablename__ = "trade_history"

    id = Column(Integer, primary_key=True)

    symbol = Column(String, nullable=False)

    side = Column(String, nullable=False)

    entry_price = Column(Float)

    exit_price = Column(Float)

    quantity = Column(Float)

    pnl = Column(Float)

    status = Column(String, default="OPEN")

    opened_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    closed_at = Column(
        DateTime,
        nullable=True
    )

    reason = Column(String, nullable=True)

    bars_held = Column(Integer, nullable=True)

    margin = Column(Float, nullable=True)

    balance = Column(Float, nullable=True)

    telegram_id = Column(String, index=True, nullable=True)


