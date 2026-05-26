from sqlalchemy import create_engine, text
from database.config import DATABASE_URL

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    # Add columns if they don't exist
    try:
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255) UNIQUE;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS cooldown_scans INTEGER DEFAULT 5;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS timeframe VARCHAR(50) DEFAULT '15m';"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS atr_sl_mult FLOAT DEFAULT 8.0;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS entry_thr FLOAT DEFAULT 0.4;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS min_hold INTEGER DEFAULT 12;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS score_set VARCHAR(50) DEFAULT 'balanced_mom';"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS use_ema_filter BOOLEAN DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS alloc_ratio FLOAT DEFAULT 0.25;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS use_telescoping_leverage BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS profile VARCHAR(50) DEFAULT 'balanced';"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS use_perf_multipliers BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS paper_trading BOOLEAN DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE risk_settings ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255) UNIQUE;"))
        conn.execute(text("ALTER TABLE risk_settings ADD COLUMN IF NOT EXISTS circuit_breaker_cooldown_scans INTEGER DEFAULT 15;"))
        conn.execute(text("ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255);"))
        conn.execute(text("ALTER TABLE trade_history ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255);"))
        
        # Create notification_settings table if not exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                telegram_id VARCHAR(255) UNIQUE,
                trade_executions BOOLEAN DEFAULT TRUE,
                daily_reports BOOLEAN DEFAULT TRUE,
                system_outages BOOLEAN DEFAULT TRUE,
                cooldown_locks BOOLEAN DEFAULT TRUE
            );
        """))
        conn.commit()

        print("Database tables altered successfully")
    except Exception as e:
        print("Migration failed:", e)
