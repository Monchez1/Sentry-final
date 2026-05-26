import os
import json
import subprocess
from pathlib import Path
from database.config import SessionLocal
from database.models.strategy_settings import StrategySettings
from database.models.risk_settings import RiskSettings
from database.models.exchange import Exchange

SETTINGS_FILE = Path("/home/kenyatta/sentry/runtime/settings.json")
CONTROL_FILE = Path("/home/kenyatta/sentry/runtime/control.json")
PID_FILE = Path("/home/kenyatta/sentry/runtime/rotator.pid")

def export_settings_from_db(telegram_id: str = None):
    """
    Export the authenticated user's strategy & risk settings to the
    shared runtime/settings.json file consumed by the rotator process.
    Falls back to the first row if no telegram_id is provided (legacy).
    """
    db = SessionLocal()
    try:
        if telegram_id:
            strat = db.query(StrategySettings).filter(
                StrategySettings.telegram_id == telegram_id
            ).first()
            risk = db.query(RiskSettings).filter(
                RiskSettings.telegram_id == telegram_id
            ).first()
        else:
            strat = db.query(StrategySettings).first()
            risk = db.query(RiskSettings).first()

        settings = {}
        if strat:
            settings.update({
                "max_positions": strat.max_positions,
                "risk_per_trade": strat.risk_per_trade,
                "leverage": strat.leverage,
                "rotation_threshold": strat.rotation_threshold,
                "stop_loss_pct": strat.stop_loss_pct,
                "take_profit_rr": strat.take_profit_rr,
                "auto_rotation": strat.auto_rotation,
                "cooldown_scans": strat.cooldown_scans,
                "telegram_id": telegram_id,
                "timeframe": strat.timeframe if strat.timeframe else "15m",
                "atr_sl_mult": float(strat.atr_sl_mult) if strat.atr_sl_mult is not None else 8.0,
                "entry_thr": float(strat.entry_thr) if strat.entry_thr is not None else 0.4,
                "min_hold": int(strat.min_hold) if strat.min_hold is not None else 12,
                "score_set": strat.score_set if strat.score_set else "balanced_mom",
                "use_ema_filter": bool(strat.use_ema_filter) if strat.use_ema_filter is not None else True,
                "alloc_ratio": float(strat.alloc_ratio) if strat.alloc_ratio is not None else 0.25,
                "use_telescoping_leverage": bool(strat.use_telescoping_leverage) if strat.use_telescoping_leverage is not None else False,
                "profile": strat.profile if strat.profile else "balanced",
                "use_perf_multipliers": bool(strat.use_perf_multipliers) if strat.use_perf_multipliers is not None else False,
                "paper_trading": bool(strat.paper_trading) if strat.paper_trading is not None else True,
            })
            if not strat.paper_trading:
                exchange = db.query(Exchange).filter(
                    Exchange.telegram_id == telegram_id,
                    Exchange.active == True
                ).first() if telegram_id else db.query(Exchange).filter(Exchange.active == True).first()
                if exchange:
                    settings.update({
                        "exchange_name": exchange.name,
                        "exchange_api_key": exchange.api_key,
                        "exchange_secret": exchange.api_secret,
                        "exchange_passphrase": exchange.passphrase
                    })
        if risk:
            settings.update({
                "max_daily_drawdown": risk.max_daily_drawdown,
                "max_open_risk": risk.max_open_risk,
                "max_consecutive_losses": risk.max_consecutive_losses,
                "emergency_stop_pct": risk.emergency_stop_pct,
                "circuit_breaker_enabled": risk.circuit_breaker_enabled,
                "circuit_breaker_cooldown_scans": risk.circuit_breaker_cooldown_scans,
                "cb_dd": risk.emergency_stop_pct * 100.0 if risk.emergency_stop_pct else 35.0,
            })


        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with SETTINGS_FILE.open("w") as f:
            json.dump(settings, f, indent=2)
    except Exception as e:
        print(f"Error exporting settings: {e}")
    finally:
        db.close()

def is_rotator_running():
    if not PID_FILE.exists():
        return False
    try:
        pid = int(PID_FILE.read_text().strip())
        os.kill(pid, 0)

        # Check if process is zombie
        stat_path = Path(f"/proc/{pid}/stat")
        if stat_path.exists():
            stat_content = stat_path.read_text()
            close_paren_idx = stat_content.rfind(")")
            if close_paren_idx != -1:
                state_char = stat_content[close_paren_idx + 2]
                if state_char == "Z":
                    print(f"Process {pid} is a zombie (defunct). Ignoring.")
                    return False
        return True
    except (ProcessLookupError, ValueError, PermissionError, IndexError):
        return False

def spawn_rotator():
    if is_rotator_running():
        return

    interpreter = "/home/kenyatta/sentry/venv/bin/python"
    script = "/home/kenyatta/sentry/rotator/live_paper_rotator.py"

    p = subprocess.Popen(
        [interpreter, script],
        cwd="/home/kenyatta/sentry",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True
    )
    PID_FILE.parent.mkdir(parents=True, exist_ok=True)
    PID_FILE.write_text(str(p.pid))
    print(f"Spawned live_paper_rotator.py with PID {p.pid}")

def write_control_file(running, command=None):
    CONTROL_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONTROL_FILE.open("w") as f:
        json.dump({"running": running, "command": command}, f, indent=2)

def start(telegram_id: str = None):
    export_settings_from_db(telegram_id)
    write_control_file(running=True, command=None)
    spawn_rotator()
    return {"message": "Rotator started"}

def pause():
    write_control_file(running=False, command=None)
    return {"message": "Rotator paused"}

def rebalance():
    write_control_file(running=True, command="rebalance")
    return {"message": "Rebalance triggered"}

def exit_all():
    write_control_file(running=False, command="exit_all")
    return {"message": "Positions exit triggered"}
