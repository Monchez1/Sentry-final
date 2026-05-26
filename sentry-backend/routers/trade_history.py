from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.deps import get_db
from database.models.trade_history import TradeHistory
from services.telegram_auth import get_current_tg_user, TelegramUser
from pathlib import Path
import csv
from datetime import datetime

router = APIRouter(
    prefix="/trade-history",
    tags=["Trade History"],
)

TRADES_CSV = Path(
    "/home/kenyatta/sentry/analytics/live_rotator_trades.csv"
)

@router.get("/")
def list_trades(
    db: Session = Depends(get_db),
    user: TelegramUser = Depends(get_current_tg_user),
):
    if TRADES_CSV.exists():
        try:
            with TRADES_CSV.open("r") as f:
                reader = csv.DictReader(f)
                for row in reader:
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

                    # Check if trade already exists
                    exists = db.query(TradeHistory).filter(
                        TradeHistory.symbol == row.get("symbol"),
                        TradeHistory.closed_at == ts,
                        TradeHistory.pnl == float(row.get("pnl", 0.0))
                    ).first()

                    if not exists:
                        # Use telegram_id from CSV row if available, else from current user
                        row_tg_id = row.get("telegram_id") or str(user.id)
                        new_trade = TradeHistory(
                            symbol=row.get("symbol"),
                            side=row.get("direction", "LONG"),
                            entry_price=float(row.get("entry", 0.0)),
                            exit_price=float(row.get("exit", 0.0)),
                            pnl=float(row.get("pnl", 0.0)),
                            status="CLOSED",
                            closed_at=ts,
                            reason=row.get("reason", "UNKNOWN"),
                            bars_held=int(float(row.get("bars_held", 0))),
                            margin=float(row.get("margin", 0.0)),
                            balance=float(row.get("balance", 0.0)),
                            telegram_id=row_tg_id,
                        )
                        db.add(new_trade)
                    else:
                        if not exists.telegram_id:
                            exists.telegram_id = row.get("telegram_id") or str(user.id)
            db.commit()

        except Exception as e:
            print(f"Error syncing trades to database: {e}")

    db_trades = (
        db.query(TradeHistory)
        .filter(TradeHistory.telegram_id == str(user.id))
        .order_by(TradeHistory.closed_at.desc())
        .all()
    )

    trades = []
    for t in db_trades:
        trades.append({
            "id": t.id,
            "closed_at": str(t.closed_at),
            "symbol": t.symbol,
            "side": t.side,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "reason": t.reason or "UNKNOWN",
            "score": 0.0,
            "bars_held": t.bars_held or 0,
            "margin": t.margin or 0.0,
            "pnl": t.pnl or 0.0,
            "balance": t.balance or 0.0,
            "status": t.status,
        })

    return trades
