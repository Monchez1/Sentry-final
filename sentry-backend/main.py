import asyncio
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, Depends
from state.sentry_state import state
from services import bot_controller
from services.rotator_state_reader import load_rotator_snapshot
from services.telegram_auth import get_current_tg_user, TelegramUser
from routers.exchanges import router as exchanges_router
from routers.strategy_settings import router as strategy_router
from routers.risk_settings import router as risk_router
from routers.activity_logs import router as activity_router
from routers.rotation_monitor import router as rotation_router
from routers.trade_history import router as trade_router
from routers.notification_settings import router as notification_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SENTRY Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "SENTRY Backend Online"}

@app.get("/portfolio")
def portfolio():
    snap = load_rotator_snapshot()
    if snap:
        return snap["portfolio"]
    return state["portfolio"]


@app.get("/signals")
def signals():
    import json
    from pathlib import Path
    signals_file = Path("/home/kenyatta/sentry/runtime/pending_signals.json")
    if signals_file.exists():
        try:
            with signals_file.open("r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading pending signals: {e}")
    return [
        {
            "symbol": "ADAUSDT",
            "side": "LONG",
            "score": 0.89,
            "rank": 1,
            "st": 0.82,
            "mom": 0.19
        },
        {
            "symbol": "AVAXUSDT",
            "side": "LONG",
            "score": 0.81,
            "rank": 2,
            "st": 0.76,
            "mom": 0.14
        },
        {
            "symbol": "NEARUSDT",
            "side": "SHORT",
            "score": 0.72,
            "rank": 3,
            "st": -0.68,
            "mom": -0.11
        }
    ]

@app.get("/positions")
def positions():
    snap = load_rotator_snapshot()
    if snap:
        return snap["positions"]
    return []


@app.get("/rotations")
def rotations():
    live_snapshot = load_rotator_snapshot()
    if live_snapshot:
        return live_snapshot["rotation"]
    return state["rotation"]

@app.get("/status")
def status():
    live_snapshot = load_rotator_snapshot()
    if live_snapshot:
        return live_snapshot["status"]
    return state["status"]

@app.post("/rotator/start")
def start_rotator(user: TelegramUser = Depends(get_current_tg_user)):
    return bot_controller.start(telegram_id=str(user.id))

@app.post("/rotator/pause")
def pause_rotator(user: TelegramUser = Depends(get_current_tg_user)):
    return bot_controller.pause()

@app.post("/rotator/rebalance")
def rebalance(user: TelegramUser = Depends(get_current_tg_user)):
    return bot_controller.rebalance()

@app.post("/rotator/exit-all")
def exit_all(user: TelegramUser = Depends(get_current_tg_user)):
    return bot_controller.exit_all()

app.include_router(exchanges_router)

app.include_router(strategy_router)

app.include_router(risk_router)

app.include_router(activity_router)

app.include_router(rotation_router)

app.include_router(trade_router)

app.include_router(notification_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            live_snapshot = load_rotator_snapshot()

            if live_snapshot:
                await websocket.send_json({
                    "type": "snapshot",
                    **live_snapshot
                })
            else:
                await websocket.send_json({
                    "type": "snapshot",
                    **state
                })

            await asyncio.sleep(2)
    except Exception:
        # Handle disconnection or connection reset cleanly
        pass

