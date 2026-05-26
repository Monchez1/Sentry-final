from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.deps import get_db
from database.models.notification_settings import NotificationSettings
from database.logger import log_event
from schemas.notification_settings import NotificationSettingsPayload
from services.telegram_auth import get_current_tg_user, TelegramUser

router = APIRouter(
    prefix="/notification-settings",
    tags=["Notification Settings"],
)

@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    settings = (
        db.query(NotificationSettings)
        .filter(NotificationSettings.telegram_id == str(user.id))
        .first()
    )

    if not settings:
        settings = NotificationSettings(telegram_id=str(user.id))
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings

@router.post("/")
def save_settings(
    payload: NotificationSettingsPayload,
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    settings = (
        db.query(NotificationSettings)
        .filter(NotificationSettings.telegram_id == str(user.id))
        .first()
    )

    if not settings:
        settings = NotificationSettings(telegram_id=str(user.id))
        db.add(settings)

    settings.trade_executions = payload.trade_executions
    settings.daily_reports = payload.daily_reports
    settings.system_outages = payload.system_outages
    settings.cooldown_locks = payload.cooldown_locks

    db.commit()

    log_event(
        db,
        "NOTIFICATIONS_UPDATE",
        f"Notification settings updated for user {user.username or user.id}",
        telegram_id=str(user.id),
    )

    return {"message": "Notification settings saved"}
