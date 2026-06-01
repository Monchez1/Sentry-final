import json
from pathlib import Path
import sys

sys.path.append("/home/kenyatta/sentry-backend")

from database.config import SessionLocal
from database.models.strategy_settings import StrategySettings

SETTINGS_FILE = Path("/home/kenyatta/sentry/runtime/settings.json")

def main():
    if not SETTINGS_FILE.exists():
        print(f"Error: {SETTINGS_FILE} does not exist.")
        return
        
    with open(SETTINGS_FILE, "r") as f:
        settings = json.load(f)
        
    db = SessionLocal()
    try:
        user_id = settings.get("telegram_id")
        if user_id:
            strat = db.query(StrategySettings).filter(StrategySettings.telegram_id == str(user_id)).first()
        else:
            strat = db.query(StrategySettings).first()
            
        if strat:
            strat.timeframe = settings.get("timeframe", "15m")
            strat.leverage = int(settings.get("leverage", 10))
            strat.atr_sl_mult = float(settings.get("atr_sl_mult", 8.0))
            strat.rotation_threshold = float(settings.get("rotation_threshold", 0.25))
            strat.entry_thr = float(settings.get("entry_thr", 0.4))
            strat.min_hold = int(settings.get("min_hold", 12))
            strat.score_set = settings.get("score_set", "balanced_mom")
            strat.use_ema_filter = bool(settings.get("use_ema_filter", True))
            strat.alloc_ratio = float(settings.get("alloc_ratio", 0.25))
            strat.use_telescoping_leverage = bool(settings.get("use_telescoping_leverage", False))
            strat.profile = settings.get("profile", "balanced")
            strat.use_perf_multipliers = bool(settings.get("use_perf_multipliers", False))
            strat.paper_trading = bool(settings.get("paper_trading", True))
            strat.paper_start_balance = float(settings.get("paper_start_balance", 10.0))
            strat.use_ml_filter = bool(settings.get("use_ml_filter", False))
            strat.ml_prob_thr = float(settings.get("ml_prob_thr", 0.55))
            
            db.commit()
            print("✅ Successfully synchronized strategy settings from settings.json to PostgreSQL database!")
        else:
            print("⚠ No StrategySettings database row found to update.")
    except Exception as e:
        print(f"Error syncing database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
