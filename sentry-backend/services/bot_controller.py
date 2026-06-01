"""
bot_controller.py

Controls the rotator process.  The control channel is the `rotator_state`
table's `control` column — the cloud Worker reads it every loop and reacts,
then clears the column to acknowledge.

Legacy local-process spawning is preserved as a dev-mode fallback.
"""
import os
import json
import subprocess
from pathlib import Path
from database.config import SessionLocal
from database.models.strategy_settings import StrategySettings
from database.models.risk_settings import RiskSettings
from database.models.exchange import Exchange
from database.models.rotator_state import RotatorState


# ---------------------------------------------------------------------------
# Local dev-mode paths (only used when running outside Render)
# ---------------------------------------------------------------------------
def get_runtime_dir():
    default_dir = "/home/kenyatta/sentry/runtime"
    try:
        os.makedirs(default_dir, exist_ok=True)
        test_file = Path(default_dir) / ".write_test"
        test_file.touch()
        test_file.unlink()
        return Path(default_dir)
    except (PermissionError, OSError):
        return Path("/tmp")

RUNTIME_DIR = get_runtime_dir()
SETTINGS_FILE = RUNTIME_DIR / "settings.json"
CONTROL_FILE  = RUNTIME_DIR / "control.json"
PID_FILE      = RUNTIME_DIR / "rotator.pid"


# ---------------------------------------------------------------------------
# Settings export (used by the local rotator's hot-reload; cloud worker
# reads the DB directly so it doesn't need this, but it doesn't hurt to keep)
# ---------------------------------------------------------------------------
def export_settings_from_db(telegram_id: str = None):
    """
    Export the authenticated user's strategy & risk settings to the
    shared runtime/settings.json file consumed by the local rotator process.
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
            risk  = db.query(RiskSettings).first()
            if strat:
                telegram_id = strat.telegram_id
            elif risk:
                telegram_id = risk.telegram_id

        settings: dict = {}
        if strat:
            settings.update({
                "max_positions":             strat.max_positions,
                "risk_per_trade":            strat.risk_per_trade,
                "leverage":                  strat.leverage,
                "rotation_threshold":        strat.rotation_threshold,
                "stop_loss_pct":             strat.stop_loss_pct,
                "take_profit_rr":            strat.take_profit_rr,
                "auto_rotation":             strat.auto_rotation,
                "cooldown_scans":            strat.cooldown_scans,
                "telegram_id":               telegram_id,
                "timeframe":                 strat.timeframe if strat.timeframe else "15m",
                "atr_sl_mult":               float(strat.atr_sl_mult)              if strat.atr_sl_mult              is not None else 8.0,
                "entry_thr":                 float(strat.entry_thr)                if strat.entry_thr                is not None else 0.4,
                "min_hold":                  int(strat.min_hold)                   if strat.min_hold                 is not None else 12,
                "score_set":                 strat.score_set                       if strat.score_set                else "balanced_mom",
                "use_ema_filter":            bool(strat.use_ema_filter)            if strat.use_ema_filter           is not None else True,
                "alloc_ratio":               float(strat.alloc_ratio)              if strat.alloc_ratio              is not None else 0.25,
                "use_telescoping_leverage":  bool(strat.use_telescoping_leverage)  if strat.use_telescoping_leverage is not None else False,
                "profile":                   strat.profile                         if strat.profile                  else "balanced",
                "use_perf_multipliers":      bool(strat.use_perf_multipliers)      if strat.use_perf_multipliers     is not None else False,
                "paper_trading":             bool(strat.paper_trading)             if strat.paper_trading            is not None else True,
                "paper_start_balance":       float(strat.paper_start_balance)      if strat.paper_start_balance      is not None else 10.0,
                "use_ml_filter":             bool(strat.use_ml_filter)             if strat.use_ml_filter            is not None else False,
                "ml_prob_thr":               float(strat.ml_prob_thr)              if strat.ml_prob_thr              is not None else 0.55,
            })
            if not strat.paper_trading:
                exchange_row = (
                    db.query(Exchange).filter(
                        Exchange.telegram_id == telegram_id,
                        Exchange.active == True
                    ).first()
                    if telegram_id
                    else db.query(Exchange).filter(Exchange.active == True).first()
                )
                if exchange_row:
                    settings.update({
                        "exchange_name":       exchange_row.name,
                        "exchange_api_key":    exchange_row.api_key,
                        "exchange_secret":     exchange_row.api_secret,
                        "exchange_passphrase": exchange_row.passphrase,
                    })
        if risk:
            settings.update({
                "max_daily_drawdown":            risk.max_daily_drawdown,
                "max_open_risk":                 risk.max_open_risk,
                "max_consecutive_losses":        risk.max_consecutive_losses,
                "emergency_stop_pct":            risk.emergency_stop_pct,
                "circuit_breaker_enabled":       risk.circuit_breaker_enabled,
                "circuit_breaker_cooldown_scans": risk.circuit_breaker_cooldown_scans,
                "cb_dd": risk.emergency_stop_pct * 100.0 if risk.emergency_stop_pct else 35.0,
            })

        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with SETTINGS_FILE.open("w") as f:
            json.dump(settings, f, indent=2)
    except Exception as e:
        print(f"Error exporting settings: {e}")
        raise e
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Cloud control: write a command to the DB control column
# ---------------------------------------------------------------------------
def _write_db_control(running: bool, command: str = None, telegram_id: str = None):
    """
    Write a control directive to the rotator_state table.
    The cloud Worker reads this column each loop and acts on it.
    """
    db = SessionLocal()
    try:
        row = db.query(RotatorState).filter(RotatorState.id == 1).first()
        if row is None:
            # Build a minimal placeholder row so the worker can see the command
            import json as _json
            placeholder = _json.dumps({
                "time": "", "balance": 10.0, "equity": 10.0,
                "peak_balance": 10.0, "drawdown_pct": 0.0,
                "open_positions": {}, "status": {"running": running},
                "rotation": {}, "paper_trading": True, "paper_start_balance": 10.0,
            })
            row = RotatorState(id=1, snapshot_json=placeholder, control=command, telegram_id=telegram_id)
            db.add(row)
        else:
            # Encode running state into control so the worker can see it immediately
            if not running and command in (None, "pause"):
                row.control = "pause"
            elif running and command is None:
                row.control = "resume"
            else:
                row.control = command
            if telegram_id:
                row.telegram_id = telegram_id
        db.commit()
    except Exception as e:
        print(f"[bot_controller] DB control write error: {e}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Local dev-mode helpers (only executed when running locally)
# ---------------------------------------------------------------------------
def _is_local_env() -> bool:
    """True when we appear to be running on the dev laptop, not Render."""
    return Path("/home/kenyatta/sentry/venv/bin/python").exists()

def is_rotator_running() -> bool:
    if not PID_FILE.exists():
        return False
    try:
        pid = int(PID_FILE.read_text().strip())
        os.kill(pid, 0)
        stat_path = Path(f"/proc/{pid}/stat")
        if stat_path.exists():
            stat_content = stat_path.read_text()
            close_paren_idx = stat_content.rfind(")")
            if close_paren_idx != -1:
                state_char = stat_content[close_paren_idx + 2]
                if state_char == "Z":
                    return False
        return True
    except (ProcessLookupError, ValueError, PermissionError, IndexError):
        return False

def spawn_rotator():
    interpreter = "/home/kenyatta/sentry/venv/bin/python"
    script      = "/home/kenyatta/sentry/rotator/live_paper_rotator.py"
    if not Path(interpreter).exists() or not Path(script).exists():
        print("[bot_controller] Local rotator not found — cloud Worker handles execution.")
        return
    if is_rotator_running():
        return
    try:
        p = subprocess.Popen(
            [interpreter, script],
            cwd="/home/kenyatta/sentry",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        PID_FILE.parent.mkdir(parents=True, exist_ok=True)
        PID_FILE.write_text(str(p.pid))
        print(f"[bot_controller] Spawned live_paper_rotator.py PID={p.pid}")
    except Exception as e:
        print(f"[bot_controller] Error spawning local rotator: {e}")

def _write_control_file(running: bool, command: str = None):
    CONTROL_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONTROL_FILE.open("w") as f:
        json.dump({"running": running, "command": command}, f, indent=2)


# ---------------------------------------------------------------------------
# Public API — called by routers
# ---------------------------------------------------------------------------
def start(telegram_id: str = None):
    export_settings_from_db(telegram_id)
    _write_db_control(running=True, command="resume", telegram_id=telegram_id)
    if _is_local_env():
        _write_control_file(running=True, command=None)
        spawn_rotator()
    return {"message": "Rotator started"}

def pause():
    _write_db_control(running=False, command="pause")
    if _is_local_env():
        _write_control_file(running=False, command=None)
    return {"message": "Rotator paused"}

def rebalance():
    _write_db_control(running=True, command="rebalance")
    if _is_local_env():
        _write_control_file(running=True, command="rebalance")
    return {"message": "Rebalance triggered"}

def exit_all():
    _write_db_control(running=False, command="exit_all")
    if _is_local_env():
        _write_control_file(running=False, command="exit_all")
    return {"message": "Positions exit triggered"}

def reset_balance():
    _write_db_control(running=True, command="reset_balance")
    if _is_local_env():
        _write_control_file(running=True, command="reset_balance")
    return {"message": "Paper balance reset triggered"}
