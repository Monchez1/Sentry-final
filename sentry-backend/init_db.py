import os
import sys
from sqlalchemy import create_engine, inspect

# Ensure the backend directory is in the path to import models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.base import Base
from database.models.exchange import Exchange
from database.models.strategy_settings import StrategySettings
from database.models.risk_settings import RiskSettings
from database.models.activity_log import ActivityLog
from database.models.trade_history import TradeHistory
from database.models.notification_settings import NotificationSettings
from database.models.rotator_state import RotatorState

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL environment variable is not set!")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database...")
engine = create_engine(db_url)

try:
    print("Creating all tables from SQLAlchemy models...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")
    inspector = inspect(engine)
    print("Available tables:", inspector.get_table_names())
except Exception as e:
    print(f"❌ Error initializing database: {e}")
    sys.exit(1)
