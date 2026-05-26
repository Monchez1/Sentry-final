from sqlalchemy.orm import Session

from database.models.activity_log import ActivityLog

def log_event(
    db: Session,
    event_type: str,
    message: str,
    severity: str = "INFO",
    telegram_id: str = None,
):
    log = ActivityLog(
        event_type=event_type,
        message=message,
        severity=severity,
        telegram_id=telegram_id,
    )

    db.add(log)
    db.commit()
