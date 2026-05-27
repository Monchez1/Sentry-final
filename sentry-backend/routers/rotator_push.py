"""
rotator_push.py — Endpoint that the LOCAL rotator calls every loop to push
its state snapshot to the Render backend, which then stores it in Neon DB.

Security: a shared `PUSH_SECRET` env var must match the X-Push-Secret header.
"""
import os
import json
from fastapi import APIRouter, Header, HTTPException, Request
from database.config import SessionLocal
from database.models.rotator_state import RotatorState

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

    Payload shape: { "snapshot": {...}, "signals": [...] }
    """
    if x_push_secret != PUSH_SECRET:
        raise HTTPException(status_code=403, detail="Invalid push secret")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    snapshot = body.get("snapshot")
    signals = body.get("signals")

    if not snapshot:
        raise HTTPException(status_code=400, detail="Missing 'snapshot' key")

    db = SessionLocal()
    try:
        # We maintain a single row per "deployment" (no multi-user rotator yet).
        # Using id=1 as the singleton row; upsert pattern.
        row = db.query(RotatorState).filter(RotatorState.id == 1).first()
        if row:
            row.snapshot_json = json.dumps(snapshot)
            row.signals_json = json.dumps(signals) if signals is not None else None
        else:
            row = RotatorState(
                id=1,
                snapshot_json=json.dumps(snapshot),
                signals_json=json.dumps(signals) if signals is not None else None,
            )
            db.add(row)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
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
        import traceback
        return {
            "ok": True,
            "control": control_dict,
            "settings": settings_dict,
            "error": str(err),
            "traceback": traceback.format_exc()
        }

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
