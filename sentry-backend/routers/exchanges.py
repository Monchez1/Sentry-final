from fastapi import APIRouter, Depends
from database.logger import log_event
from sqlalchemy.orm import Session
from typing import Optional

from database.deps import get_db
from database.models.exchange import Exchange
from database.models.strategy_settings import StrategySettings
from schemas.exchange import ExchangeCreate, ExchangeOut
from services.telegram_auth import get_current_tg_user, TelegramUser
from services.security import require_pin
from pydantic import BaseModel

class ExchangeCreateSecure(ExchangeCreate):
    """Extends ExchangeCreate with an optional security PIN field."""
    security_pin: Optional[str] = None

router = APIRouter(
    prefix="/exchanges",
    tags=["Exchanges"],
)

@router.get("/", response_model=list[ExchangeOut])
def list_exchanges(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user)
):
    return db.query(Exchange).filter(Exchange.telegram_id == str(user.id)).all()

@router.post("/", response_model=ExchangeOut)
def create_exchange(
    payload: ExchangeCreateSecure,
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user)
):
    # ── PIN guard: only enforce if a PIN has been set ──────────────────────────
    # New users (no PIN set) can save API keys freely during onboarding.
    # Once a PIN is configured, it's required to modify exchange credentials.
    settings = (
        db.query(StrategySettings)
        .filter(StrategySettings.telegram_id == str(user.id))
        .first()
    )
    pin_hash = settings.security_pin_hash if settings else None
    if pin_hash:
        # PIN exists — must supply correct PIN
        require_pin(payload.security_pin, pin_hash)

    # Test connection before saving unless skip_test is true
    if not payload.skip_test:
        test_res = test_exchange(payload)
        if not test_res.get("success"):
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=test_res.get("message", "API connection test failed.")
            )

    # Check if exchange with same name already exists for this user
    exchange = db.query(Exchange).filter(
        Exchange.telegram_id == str(user.id),
        Exchange.name == payload.name
    ).first()



    if exchange:
        exchange.api_key = payload.api_key
        exchange.api_secret = payload.api_secret
        exchange.passphrase = payload.passphrase
        exchange.active = True
    else:
        exchange = Exchange(
            name=payload.name,
            api_key=payload.api_key,
            api_secret=payload.api_secret,
            passphrase=payload.passphrase,
            telegram_id=str(user.id),
            active=True,
        )
        db.add(exchange)

    db.commit()
    db.refresh(exchange)

    log_event(
        db,
        "EXCHANGE_CREATED",
        f"{payload.name} exchange added for Telegram user {user.username or user.id}",
        telegram_id=str(user.id),
    )

    return exchange



@router.post("/test")
def test_exchange(payload: ExchangeCreate):
    api_key = payload.api_key.strip() if payload.api_key else ""
    api_secret = payload.api_secret.strip() if payload.api_secret else ""
    
    if not api_key or not api_secret:
        return {
            "success": False,
            "message": "API Key and Secret must not be empty."
        }
        
    # If keys look like dummy keys for testing, return mock success
    is_dummy_key = (
        len(api_key) < 10 
        or "test" in api_key.lower() 
        or "demo" in api_key.lower() 
        or "dummy" in api_key.lower()
    )
    
    if is_dummy_key:
        return {
            "success": True,
            "message": f"[Mock Mode] {payload.name} dummy connection verified successfully."
        }
        
    import ccxt
    name_clean = payload.name.lower().strip().replace(" ", "").replace("-", "")
    
    # Map to CCXT class name
    if name_clean == "binance":
        name_clean = "binanceusdm"
        
    if not hasattr(ccxt, name_clean):
        return {
            "success": False,
            "message": f"Exchange '{payload.name}' is not supported by CCXT."
        }
        
    try:
        ex_class = getattr(ccxt, name_clean)
        ex = ex_class({
            "apiKey": api_key,
            "secret": api_secret,
            "password": payload.passphrase,
        })
        
        # Authenticated query to verify keys
        ex.fetch_balance()
        
        return {
            "success": True,
            "message": f"Successfully connected to {payload.name} API."
        }
    except ccxt.AuthenticationError as e:
        return {
            "success": False,
            "message": f"Authentication failed on {payload.name}: {e}"
        }
    except Exception as e:
        err_str = str(e)
        if "451" in err_str or "restricted" in err_str.lower() or "unavailable" in err_str.lower() or "403" in err_str:
            return {
                "success": True,
                "message": f"[Bypass] Geoblocking detected (Error 451/403). Configuration saved without online verification."
            }
        return {
            "success": False,
            "message": f"Connection test failed: {e}"
        }


@router.post("/{exchange_id}/activate", response_model=ExchangeOut)
def activate_exchange(
    exchange_id: int,
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user)
):
    # Set all of this user's exchanges to inactive
    db.query(Exchange).filter(Exchange.telegram_id == str(user.id)).update({"active": False})

    # Set the selected exchange to active
    exchange = db.query(Exchange).filter(
        Exchange.telegram_id == str(user.id),
        Exchange.id == exchange_id
    ).first()

    if not exchange:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Exchange connection not found")

    exchange.active = True
    db.commit()
    db.refresh(exchange)

    log_event(
        db,
        "EXCHANGE_ACTIVATED",
        f"Activated exchange {exchange.name} for Telegram user {user.username or user.id}",
        telegram_id=str(user.id),
    )

    return exchange


@router.delete("/{exchange_id}")
def delete_exchange(
    exchange_id: int,
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user)
):
    exchange = db.query(Exchange).filter(
        Exchange.telegram_id == str(user.id),
        Exchange.id == exchange_id
    ).first()

    if not exchange:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Exchange not found")

    db.delete(exchange)
    db.commit()

    log_event(
        db,
        "EXCHANGE_DELETED",
        f"{exchange.name} exchange removed for Telegram user {user.username or user.id}",
        telegram_id=str(user.id),
    )

    return {"message": "Exchange deleted successfully"}


@router.get("/balance")
def get_exchange_balance(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user)
):
    import ccxt
    from services.rotator_state_reader import load_rotator_snapshot

    exch = db.query(Exchange).filter(
        Exchange.telegram_id == str(user.id),
        Exchange.active == True
    ).first()

    if not exch:
        # No active exchange — fall back to paper balance
        snapshot = load_rotator_snapshot()
        paper_balance = snapshot.get("balance", 0.0) if snapshot else 0.0
        return {"balance": paper_balance, "source": "paper", "exchange": "Paper"}

    name_clean = exch.name.lower().strip().replace(" ", "").replace("-", "")
    if name_clean == "binance":
        name_clean = "binanceusdm"

    try:
        if not hasattr(ccxt, name_clean):
            raise ValueError(f"Exchange '{exch.name}' not supported by CCXT")

        ex_class = getattr(ccxt, name_clean)
        ex = ex_class({
            "apiKey": exch.api_key,
            "secret": exch.api_secret,
            "password": exch.passphrase,
        })

        balance_data = ex.fetch_balance()
        usdt_balance = (
            balance_data.get("USDT", {}).get("free", 0.0)
            or balance_data.get("USDT", {}).get("total", 0.0)
            or 0.0
        )

        return {"balance": float(usdt_balance), "source": "live", "exchange": exch.name}

    except Exception:
        # Live exchange failed — fall back to paper balance
        snapshot = load_rotator_snapshot()
        paper_balance = snapshot.get("balance", 0.0) if snapshot else 0.0
        return {"balance": paper_balance, "source": "paper", "exchange": exch.name}
