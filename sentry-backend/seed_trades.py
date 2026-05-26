from database.config import SessionLocal
from database.models.trade_history import TradeHistory

db = SessionLocal()

if db.query(TradeHistory).count() == 0:

    db.add(
        TradeHistory(
            symbol="ADAUSDT",
            side="LONG",
            entry_price=0.82,
            exit_price=0.85,
            quantity=100,
            pnl=4.2,
            status="CLOSED",
        )
    )

    db.add(
        TradeHistory(
            symbol="BTCUSDT",
            side="SHORT",
            entry_price=78000,
            exit_price=78800,
            quantity=0.01,
            pnl=-1.1,
            status="CLOSED",
        )
    )

    db.add(
        TradeHistory(
            symbol="DOGEUSDT",
            side="LONG",
            entry_price=0.18,
            exit_price=0.195,
            quantity=500,
            pnl=8.7,
            status="CLOSED",
        )
    )

    db.commit()

print("Trade seed complete")
