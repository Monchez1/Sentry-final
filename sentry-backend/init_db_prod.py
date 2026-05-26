import os
import sys
from sqlalchemy import create_engine, text, inspect

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL environment variable is not set!")
    sys.exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database...")
engine = create_engine(db_url)

SCHEMA = """
-- Exchanges table
CREATE TABLE IF NOT EXISTS exchanges (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255),
    exchange_name VARCHAR(100) NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    is_testnet BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Strategy settings
CREATE TABLE IF NOT EXISTS strategy_settings (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE,
    max_positions INTEGER DEFAULT 5,
    leverage INTEGER DEFAULT 3,
    cooldown_scans INTEGER DEFAULT 5,
    timeframe VARCHAR(50) DEFAULT '15m',
    atr_sl_mult FLOAT DEFAULT 8.0,
    entry_thr FLOAT DEFAULT 0.4,
    min_hold INTEGER DEFAULT 12,
    score_set VARCHAR(50) DEFAULT 'balanced_mom',
    use_ema_filter BOOLEAN DEFAULT TRUE,
    alloc_ratio FLOAT DEFAULT 0.25,
    use_telescoping_leverage BOOLEAN DEFAULT FALSE,
    profile VARCHAR(50) DEFAULT 'balanced',
    use_perf_multipliers BOOLEAN DEFAULT FALSE,
    paper_trading BOOLEAN DEFAULT TRUE
);

-- Risk settings
CREATE TABLE IF NOT EXISTS risk_settings (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE,
    max_drawdown FLOAT DEFAULT 0.25,
    daily_loss_limit FLOAT DEFAULT 0.05,
    per_trade_risk FLOAT DEFAULT 0.02,
    circuit_breaker BOOLEAN DEFAULT TRUE,
    circuit_breaker_cooldown_scans INTEGER DEFAULT 15
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trade history
CREATE TABLE IF NOT EXISTS trade_history (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    entry_price FLOAT,
    exit_price FLOAT,
    pnl FLOAT,
    leverage INTEGER DEFAULT 1,
    opened_at TIMESTAMP,
    closed_at TIMESTAMP
);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE,
    trade_executions BOOLEAN DEFAULT TRUE,
    daily_reports BOOLEAN DEFAULT TRUE,
    system_outages BOOLEAN DEFAULT TRUE,
    cooldown_locks BOOLEAN DEFAULT TRUE
);
"""

try:
    with engine.connect() as conn:
        conn.execute(text(SCHEMA))
        conn.commit()
    print("✅ All tables created successfully!")
    inspector = inspect(engine)
    print("Available tables:", inspector.get_table_names())
except Exception as e:
    print(f"❌ Error initializing database: {e}")
    sys.exit(1)
