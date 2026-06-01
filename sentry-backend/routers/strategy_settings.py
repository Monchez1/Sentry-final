from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.deps import get_db
from database.models.strategy_settings import StrategySettings
from database.logger import log_event
from schemas.strategy_settings import StrategySettingsPayload
from services.telegram_auth import get_current_tg_user, TelegramUser

router = APIRouter(
    prefix="/strategy-settings",
    tags=["Strategy Settings"],
)

@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    settings = (
        db.query(StrategySettings)
        .filter(StrategySettings.telegram_id == str(user.id))
        .first()
    )

    if not settings:
        settings = StrategySettings(telegram_id=str(user.id))
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings

@router.post("/")
def save_settings(
    payload: StrategySettingsPayload,
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    settings = (
        db.query(StrategySettings)
        .filter(StrategySettings.telegram_id == str(user.id))
        .first()
    )

    if not settings:
        settings = StrategySettings(telegram_id=str(user.id))
        db.add(settings)

    settings.max_positions = payload.max_positions
    settings.risk_per_trade = payload.risk_per_trade
    settings.leverage = payload.leverage
    settings.rotation_threshold = payload.rotation_threshold
    settings.stop_loss_pct = payload.stop_loss_pct
    settings.take_profit_rr = payload.take_profit_rr
    settings.auto_rotation = payload.auto_rotation
    settings.cooldown_scans = payload.cooldown_scans
    
    settings.timeframe = payload.timeframe
    settings.atr_sl_mult = payload.atr_sl_mult
    settings.entry_thr = payload.entry_thr
    settings.min_hold = payload.min_hold
    settings.score_set = payload.score_set
    settings.use_ema_filter = payload.use_ema_filter
    settings.alloc_ratio = payload.alloc_ratio
    settings.use_telescoping_leverage = payload.use_telescoping_leverage
    settings.profile = payload.profile
    settings.use_perf_multipliers = payload.use_perf_multipliers
    settings.paper_trading = payload.paper_trading
    settings.paper_start_balance = payload.paper_start_balance
    settings.use_ml_filter = payload.use_ml_filter
    settings.ml_prob_thr = payload.ml_prob_thr

    db.commit()


    from services.bot_controller import export_settings_from_db
    export_settings_from_db(str(user.id))

    log_event(
        db,
        "STRATEGY_UPDATE",
        f"Strategy settings updated for user {user.username or user.id}",
        telegram_id=str(user.id),
    )

    return {"message": "Strategy settings saved"}
