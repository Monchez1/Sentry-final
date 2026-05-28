from database.base import Base
from database.config import engine

from database.models.exchange import Exchange
from database.models.strategy_settings import StrategySettings
from database.models.risk_settings import RiskSettings
from database.models.activity_log import ActivityLog
from database.models.trade_history import TradeHistory
from database.models.notification_settings import NotificationSettings
from database.models.rotator_state import RotatorState

Base.metadata.create_all(bind=engine)

print("Tables created successfully")
