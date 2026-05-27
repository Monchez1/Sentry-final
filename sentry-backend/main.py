import asyncio
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, Depends
from state.sentry_state import state
from services import bot_controller
from services.rotator_state_reader import load_rotator_snapshot
from services.rotator_engine import start_engine
from services.telegram_auth import get_current_tg_user, TelegramUser
from routers.exchanges import router as exchanges_router
from routers.strategy_settings import router as strategy_router
from routers.risk_settings import router as risk_router
from routers.activity_logs import router as activity_router
from routers.rotation_monitor import router as rotation_router
from routers.trade_history import router as trade_router
from routers.notification_settings import router as notification_router
from routers.rotator_push import router as rotator_push_router
from fastapi.middleware.cors import CORSMiddleware


# ── Lifespan: start the cloud rotator engine when FastAPI boots ───────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run the DB migration for new columns (idempotent — ADD COLUMN IF NOT EXISTS)
    try:
        from database.config import DATABASE_URL
        from sqlalchemy import create_engine, text
        _engine = create_engine(DATABASE_URL)
        with _engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE rotator_state ADD COLUMN IF NOT EXISTS control VARCHAR(64);"
            ))
            conn.commit()
        _engine.dispose()
    except Exception as _e:
        print(f"[startup] DB migration skipped / already applied: {_e}")

    # Launch the rotator as a background daemon thread
    start_engine()
    print("[startup] Cloud rotator engine launched.")
    yield
    # (no teardown needed — daemon thread exits with the process)


app = FastAPI(title="SENTRY Backend", lifespan=lifespan)

# CORS
_cors_env    = os.environ.get("CORS_ORIGINS", "*")
cors_origins = [o.strip() for o in _cors_env.split(",")] if _cors_env != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health endpoint (pinged every 14 min by rotator to prevent Render spin-down)
@app.get("/health")
def health():
    return {"status": "ok"}

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
    snap = load_rotator_snapshot()
    if snap and snap.get("signals"):
        return snap["signals"]
    return []

@app.get("/positions")
def positions():
    snap = load_rotator_snapshot()
    if snap:
        return snap["positions"]
    return []

@app.get("/rotations")
def rotations():
    snap = load_rotator_snapshot()
    if snap:
        return snap["rotation"]
    return state["rotation"]

@app.get("/status")
def status():
    snap = load_rotator_snapshot()
    if snap:
        return snap["status"]
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

@app.post("/rotator/reset-balance")
def reset_balance(user: TelegramUser = Depends(get_current_tg_user)):
    return bot_controller.reset_balance()

app.include_router(exchanges_router)
app.include_router(strategy_router)
app.include_router(risk_router)
app.include_router(activity_router)
app.include_router(rotation_router)
app.include_router(trade_router)
app.include_router(notification_router)
app.include_router(rotator_push_router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            live_snapshot = load_rotator_snapshot()
            await websocket.send_json({
                "type": "snapshot",
                **(live_snapshot if live_snapshot else state),
            })
            await asyncio.sleep(1)
    except Exception:
        pass
