from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.deps import get_db
from database.models.risk_settings import RiskSettings
from schemas.risk_settings import RiskSettingsPayload
from database.logger import log_event
from services.telegram_auth import get_current_tg_user, TelegramUser

router = APIRouter(
    prefix="/risk-settings",
    tags=["Risk Settings"],
)

@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    settings = (
        db.query(RiskSettings)
        .filter(RiskSettings.telegram_id == str(user.id))
        .first()
    )

    if not settings:
        settings = RiskSettings(telegram_id=str(user.id))
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings

@router.post("/")
def save_settings(
    payload: RiskSettingsPayload,
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    settings = (
        db.query(RiskSettings)
        .filter(RiskSettings.telegram_id == str(user.id))
        .first()
    )

    if not settings:
        settings = RiskSettings(telegram_id=str(user.id))
        db.add(settings)

    settings.max_daily_drawdown = payload.max_daily_drawdown
    settings.max_open_risk = payload.max_open_risk
    settings.max_consecutive_losses = payload.max_consecutive_losses
    settings.emergency_stop_pct = payload.emergency_stop_pct
    settings.circuit_breaker_enabled = payload.circuit_breaker_enabled
    settings.circuit_breaker_cooldown_scans = payload.circuit_breaker_cooldown_scans

    db.commit()


    from services.bot_controller import export_settings_from_db
    export_settings_from_db(str(user.id))

    log_event(
        db,
        "RISK_UPDATE",
        f"Risk settings updated for user {user.username or user.id}",
        telegram_id=str(user.id),
    )

    return {"message": "Risk settings saved"}
