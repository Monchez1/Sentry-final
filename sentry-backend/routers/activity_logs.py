from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.deps import get_db
from database.models.activity_log import ActivityLog
from services.telegram_auth import get_current_tg_user, TelegramUser
import json
from pathlib import Path
from datetime import datetime

router = APIRouter(
    prefix="/activity-logs",
    tags=["Activity Logs"],
)

BOT_LOGS_FILE = Path("/home/kenyatta/sentry/runtime/bot_logs.json")

@router.get("/")
def list_logs(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    if BOT_LOGS_FILE.exists():
        try:
            with BOT_LOGS_FILE.open("r") as f:
                bot_logs = json.load(f)

            for log in bot_logs:
                msg = log.get("message")
                ts_str = log.get("timestamp")
                log_tg_id = log.get("telegram_id")
                if not msg or not ts_str:
                    continue

                try:
                    ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S.%f")
                except ValueError:
                    try:
                        ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        ts = datetime.utcnow()

                exists = db.query(ActivityLog).filter(
                    ActivityLog.message == msg,
                    ActivityLog.event_type == log.get("event_type")
                ).first()

                if not exists:
                    new_log = ActivityLog(
                        timestamp=ts,
                        event_type=log.get("event_type"),
                        message=msg,
                        severity=log.get("severity", "INFO"),
                        telegram_id=log_tg_id or str(user.id),
                    )
                    db.add(new_log)
            db.commit()
        except Exception as e:
            print(f"Error syncing bot logs: {e}")

    return (
        db.query(ActivityLog)
        .filter(ActivityLog.telegram_id == str(user.id))
        .order_by(ActivityLog.timestamp.desc())
        .limit(100)
        .all()
    )
