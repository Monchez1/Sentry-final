import json
from pathlib import Path

ROTATOR_STATE_PATH = Path(
    "/home/kenyatta/sentry/runtime/live_rotator_state.json"
)

def load_rotator_snapshot():
    if not ROTATOR_STATE_PATH.exists():
        return None

    try:
        with ROTATOR_STATE_PATH.open("r") as f:
            raw = json.load(f)
    except (json.JSONDecodeError, PermissionError):
        return None

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

    # Read live status and rotation info written by python loop
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
            "progress": progress
        })

    return {
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

