from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import Boolean
from sqlalchemy import String

from database.base import Base

class StrategySettings(Base):
    __tablename__ = "strategy_settings"

    id = Column(Integer, primary_key=True)

    max_positions = Column(Integer, default=4)

    risk_per_trade = Column(Float, default=0.02)

    leverage = Column(Integer, default=10)

    rotation_threshold = Column(Float, default=0.25)

    stop_loss_pct = Column(Float, default=0.01)

    take_profit_rr = Column(Float, default=3.0)

    auto_rotation = Column(Boolean, default=True)

    cooldown_scans = Column(Integer, default=5)

    telegram_id = Column(String, unique=True, index=True, nullable=True)

    timeframe = Column(String, default="15m")
    atr_sl_mult = Column(Float, default=8.0)
    entry_thr = Column(Float, default=0.4)
    min_hold = Column(Integer, default=12)
    score_set = Column(String, default="balanced_mom")
    use_ema_filter = Column(Boolean, default=True)

    alloc_ratio = Column(Float, default=0.25)
    use_telescoping_leverage = Column(Boolean, default=False)
    profile = Column(String, default="balanced")
    use_perf_multipliers = Column(Boolean, default=False)
    paper_trading = Column(Boolean, default=True)
    paper_start_balance = Column(Float, default=10.0)






