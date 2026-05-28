"""
rotator_push.py — Endpoint that the LOCAL rotator calls every loop to push
its state snapshot to the Render backend, which then stores it in Neon DB.

Security: a shared `PUSH_SECRET` env var must match the X-Push-Secret header.
"""
import os
import json
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, Request
from database.config import SessionLocal
from database.models.rotator_state import RotatorState
from database.models.trade_history import TradeHistory
from services.rotator_state_reader import update_cached_snapshot, _parse_snapshot

router = APIRouter(
    prefix="/rotator",
    tags=["Rotator Push"],
)

PUSH_SECRET = os.environ.get("PUSH_SECRET", "sentry-rotator-push-secret")


@router.post("/push-state")
async def push_state(
    request: Request,
    x_push_secret: str = Header(default=""),
):
    """
    Accepts a JSON payload from the local rotator and persists it to the DB.
    The rotator should call this every loop iteration.

    Payload shape: { "snapshot": {...}, "signals": [...], "trades": [...] }
    """
    if x_push_secret != PUSH_SECRET:
        raise HTTPException(status_code=403, detail="Invalid push secret")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    snapshot = body.get("snapshot")
    signals = body.get("signals")
    trades = body.get("trades")

    if snapshot:
        db = SessionLocal()
        try:
            # We maintain a single row per "deployment" (no multi-user rotator yet).
            # Using id=1 as the singleton row; upsert pattern.
            row = db.query(RotatorState).filter(RotatorState.id == 1).first()
            if row:
                row.snapshot_json = json.dumps(snapshot)
                row.signals_json = json.dumps(signals) if signals is not None else row.signals_json
            else:
                row = RotatorState(
                    id=1,
                    snapshot_json=json.dumps(snapshot),
                    signals_json=json.dumps(signals) if signals is not None else None,
                )
                db.add(row)
            db.commit()
            # Update in-memory cache immediately so WebSocket gets it on next tick
            try:
                db_signals = signals
                if db_signals is None and row and row.signals_json:
                    db_signals = json.loads(row.signals_json)
                update_cached_snapshot(_parse_snapshot(snapshot, db_signals))
            except Exception:
                pass
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"DB error: {e}")
        finally:
            db.close()

    if trades:
        db = SessionLocal()
        try:
            # Resolve target telegram_id for this batch, defaulting to owner 6420024048.
            # We look for a valid non-mock, non-null telegram_id in the payload.
            row_tg_id = "6420024048"
            for t in trades:
                tid = t.get("telegram_id")
                if tid and tid not in ("99999999", "null") and tid.strip() != "":
                    row_tg_id = tid.strip()
                    break

            existing = db.query(TradeHistory.symbol, TradeHistory.closed_at, TradeHistory.pnl).filter(
                TradeHistory.telegram_id == row_tg_id
            ).all()
            
            existing_set = {
                (t.symbol, t.closed_at, round(float(t.pnl), 4))
                for t in existing
            }

            new_trades_added = 0
            for row in trades:
                ts_str = row.get("closed_at")
                if not ts_str:
                    continue

                try:
                    ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S.%f")
                except ValueError:
                    try:
                        ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        ts = datetime.utcnow()

                symbol = row.get("symbol")
                pnl = float(row.get("pnl", 0.0))
                pnl_rounded = round(pnl, 4)

                if (symbol, ts, pnl_rounded) not in existing_set:
                    new_trade = TradeHistory(
                        symbol=symbol,
                        side=row.get("direction", "LONG"),
                        entry_price=float(row.get("entry", 0.0)),
                        exit_price=float(row.get("exit", 0.0)),
                        pnl=pnl,
                        status="CLOSED",
                        closed_at=ts,
                        reason=row.get("reason", "UNKNOWN"),
                        bars_held=int(float(row.get("bars_held", 0))),
                        margin=float(row.get("margin", 0.0)),
                        balance=float(row.get("balance", 0.0)),
                        telegram_id=row_tg_id,
                    )
                    db.add(new_trade)
                    new_trades_added += 1

            if new_trades_added > 0:
                db.commit()
                print(f"[rotator_push] Successfully synced {new_trades_added} new trades to database.")
        except Exception as e:
            db.rollback()
            print(f"[rotator_push] Error syncing trades to database: {e}")
        finally:
            db.close()

    # Load strategy/risk settings and control state to return to the push agent
    control_dict = {"running": True, "command": None}
    settings_dict = {}
    try:
        from services.bot_controller import export_settings_from_db, write_control_file, SETTINGS_FILE, CONTROL_FILE
        # Export settings from Postgres to settings.json file on Render container
        export_settings_from_db()
        if SETTINGS_FILE.exists():
            with SETTINGS_FILE.open("r") as f:
                settings_dict = json.load(f)

        if CONTROL_FILE.exists():
            with CONTROL_FILE.open("r") as f:
                control_dict = json.load(f)
            # If there is a command, clear it from Render's local disk so it only executes once
            if control_dict.get("command"):
                write_control_file(running=control_dict.get("running", True), command=None)
    except Exception as err:
        print(f"[rotator_push] Error loading settings/control to return: {err}")

    return {
        "ok": True,
        "control": control_dict,
        "settings": settings_dict
    }


@router.get("/push-state/status")
def push_state_status():
    """Returns the age and summary of the last pushed state (for diagnostics)."""
    db = SessionLocal()
    try:
        from sqlalchemy import text
        row = db.query(RotatorState).filter(RotatorState.id == 1).first()
        if row is None:
            return {"status": "no_data", "updated_at": None}
        snap = json.loads(row.snapshot_json)
        return {
            "status": "ok",
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            "snapshot_time": snap.get("time"),
            "equity": snap.get("equity"),
            "positions": len(snap.get("open_positions", {})),
            "scanner": snap.get("status", {}).get("scanner"),
        }
    finally:
        db.close()
