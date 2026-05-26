import json
import os
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# LOCAL fallback: read from the local filesystem (works when backend runs on
# the same machine as the rotator, e.g. the dev machine).
# ---------------------------------------------------------------------------
ROTATOR_STATE_PATH = Path(
    "/home/kenyatta/sentry/runtime/live_rotator_state.json"
)
SIGNALS_PATH = Path(
    "/home/kenyatta/sentry/runtime/pending_signals.json"
)


def _parse_snapshot(raw: dict, signals: Optional[list] = None) -> dict:
    """Convert the raw rotator state dict into the shape the API/WS expects."""
    open_positions = raw.get("open_positions", {})
    positions_filled = len(open_positions)

    weakest_symbol = None
    weakest_score = None
    if open_positions:
        weakest_symbol, weakest_data = min(
            open_positions.items(),
            key=lambda item: abs(item[1].get("score", 0))
        )
        weakest_score = weakest_data.get("score", 0)

    status = raw.get("status", {
        "running": True,
        "positions": positions_filled,
        "scanner": "ACTIVE",
        "rotation": "ENABLED",
    })

    rotation = raw.get("rotation", {
        "current": weakest_symbol or "-",
        "current_score": weakest_score or 0,
        "candidate": "-",
        "candidate_score": 0,
        "approved": False,
    })

    mapped_positions = []
    for pos in open_positions.values():
        symbol = pos.get("symbol")
        direction = pos.get("direction", "LONG")
        entry = pos.get("entry", 0.0)
        margin = pos.get("margin", 0.0)
        notional = pos.get("notional", 0.0)
        trail_stop = pos.get("trail_stop", 0.0)
        bars_held = pos.get("bars_held", 0)
        peak_price = pos.get("peak_price", entry)
        trough_price = pos.get("trough_price", entry)
        pnl = pos.get("pnl", 0.0)
        pnl_pct = pos.get("pnl_pct", 0.0)
        progress = pos.get("progress", 0.0)

        mapped_positions.append({
            "symbol": symbol,
            "direction": direction,
            "side": direction,
            "entry": entry,
            "margin": margin,
            "notional": notional,
            "trail_stop": trail_stop,
            "stop": round(trail_stop, 5),
            "bars_held": bars_held,
            "held_bars": bars_held,
            "peak_price": peak_price,
            "peak": round(peak_price if direction == "LONG" else trough_price, 5),
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "progress": progress,
        })

    result = {
        "portfolio": {
            "equity": round(raw.get("equity", 0), 2),
            "today_pnl": round(raw.get("equity", 0) - 10.0, 2),
            "today_pnl_pct": round(((raw.get("equity", 10.0) - 10.0) / 10.0) * 100, 2),
            "positions_filled": positions_filled,
            "max_positions": 4,
            "drawdown": round(raw.get("drawdown_pct", 0), 2),
            "circuit_limit": 35,
        },
        "status": status,
        "rotation": rotation,
        "positions": mapped_positions,
        "paper_trading": raw.get("paper_trading", True),
    }

    if signals is not None:
        result["signals"] = signals

    return result


def _load_from_db() -> Optional[dict]:
    """Try to load the latest rotator snapshot from the Neon database."""
    try:
        from database.config import SessionLocal
        from database.models.rotator_state import RotatorState

        db = SessionLocal()
        try:
            row = db.query(RotatorState).order_by(RotatorState.updated_at.desc()).first()
            if row is None:
                return None
            raw = json.loads(row.snapshot_json)
            signals = json.loads(row.signals_json) if row.signals_json else None
            return _parse_snapshot(raw, signals)
        finally:
            db.close()
    except Exception as e:
        print(f"[rotator_state_reader] DB read error: {e}")
        return None


def _load_from_local_file() -> Optional[dict]:
    """Fallback: read from local filesystem (dev/local deployments)."""
    if not ROTATOR_STATE_PATH.exists():
        return None
    try:
        with ROTATOR_STATE_PATH.open("r") as f:
            raw = json.load(f)
        signals = None
        if SIGNALS_PATH.exists():
            try:
                with SIGNALS_PATH.open("r") as f:
                    signals = json.load(f)
            except Exception:
                pass
        return _parse_snapshot(raw, signals)
    except (json.JSONDecodeError, PermissionError) as e:
        print(f"[rotator_state_reader] Local file read error: {e}")
        return None


def load_rotator_snapshot() -> Optional[dict]:
    """
    Load the latest rotator snapshot.

    Priority:
      1. Neon DB (works when backend is on Render / any cloud host)
      2. Local filesystem (works when backend runs on the same machine as rotator)
    """
    # Try DB first
    snap = _load_from_db()
    if snap is not None:
        return snap

    # Fallback to local file (dev mode / same-machine deployments)
    return _load_from_local_file()
