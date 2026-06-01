"""
rotator_engine.py  —  Cloud-native Sentry rotator engine.

Runs as a daemon thread inside the FastAPI web process so it needs no
separate Render service and stays within the free-tier hour budget.

Design:
  • Reads ALL config from Neon DB (strategy_settings, risk_settings, exchanges)
  • Writes ALL state to Neon DB (rotator_state table)
  • Persists closed trades to Neon DB (trade_history table)
  • Logs events to Neon DB (activity_logs table)
  • Reads control commands from rotator_state.control column (set by API)
  • Self-pings RENDER_EXTERNAL_URL every 14 min to prevent free-tier spin-down
  • Zero local file I/O — runs identically on any cloud host
"""

import os
import time
import json
import threading
import requests
import ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Optional

# ── Singleton management ──────────────────────────────────────────────────────

_engine_instance: Optional["RotatorEngine"] = None
_engine_lock = threading.Lock()


def get_engine() -> Optional["RotatorEngine"]:
    return _engine_instance


def start_engine():
    """Called once on FastAPI startup. Idempotent."""
    global _engine_instance
    with _engine_lock:
        if _engine_instance and _engine_instance.alive:
            return
        eng = RotatorEngine()
        _engine_instance = eng
        t = threading.Thread(target=eng.run, daemon=True, name="sentry-rotator")
        t.start()
        print("[rotator_engine] Background rotator thread started.")


# ── The Engine ────────────────────────────────────────────────────────────────

class RotatorEngine:
    # ── Constants ──────────────────────────────────────────────────────────
    CANDLE_LIMIT = 250
    LOOP_SECONDS = 60
    MAKER_FEE = 0.0002
    FUNDING_RATE_8H = 0.0001

    def __init__(self):
        self.alive = True

        # Trading state
        self.balance: float = 10.0
        self.peak_balance: float = 10.0
        self.paper_start_balance: float = 10.0
        self.open_positions: dict = {}
        self.closed_trades: list = []
        self.cooldowns: dict = {}
        self.circuit_cooldown: int = 0
        self.last_candidate_symbol: str = "-"
        self.last_candidate_score: float = 0.0
        self.last_decision: str = "HOLD"
        self.last_telescoped_leverage: float = 10.0
        self.notified_symbols: dict = {}

        # Strategy config (hot-reloaded from DB each loop)
        self.telegram_id: Optional[str] = None
        self.max_positions: int = 4
        self.leverage: float = 10.0
        self.max_pos_dd_mult: float = 0.5
        self.cb_dd: float = 35.0
        self.atr_sl_mult: float = 8.0
        self.rot_boost: float = 0.3
        self.entry_thr: float = 0.4
        self.min_hold: int = 12
        self.score_set: str = "trend_0_85_15"
        self.auto_trade: bool = True
        self.take_profit_rr: float = 3.0
        self.cooldown_scans: int = 5
        self.circuit_breaker_cooldown_scans: int = 15
        self.TIMEFRAME: str = "15m"
        self.use_ema_filter: bool = True
        self.alloc_ratio: float = 0.25
        self.use_telescoping_leverage: bool = False
        self.use_perf_multipliers: bool = False
        self.paper_trading: bool = True

        # Score weights
        self.W_RSI: float = 0.0
        self.W_ST:  float = 0.85
        self.W_MOM: float = 0.15

        # Exchange client
        self.exchange = None

        # Timing
        self._last_settings_hash: str = ""
        self._last_self_ping: float = 0.0
        self.SELF_PING_INTERVAL = 14 * 60  # 14 minutes

    # ──────────────────────────────────────────────────────────────────────
    # DB helpers
    # ──────────────────────────────────────────────────────────────────────

    def _db(self):
        from database.config import SessionLocal
        return SessionLocal()

    def init_paper_exchange(self):
        """Initialise exchange client for paper trading, fallback to Bybit if geoblocked."""
        if self.exchange is not None:
            current_id = getattr(self.exchange, "id", "")
            if current_id in ("binanceusdm", "bybit"):
                return

        # Attempt to use binanceusdm, fallback to bybit if geoblocked (e.g. Error 451/403)
        try:
            print("[rotator] Initialising Binance USDM for paper trading...")
            test_exch = ccxt.binanceusdm({"enableRateLimit": True})
            test_exch.load_markets()
            self.exchange = test_exch
            print("[rotator] Binance USDM initialised successfully for paper trading.")
        except Exception as e:
            err_str = str(e)
            if "451" in err_str or "restricted" in err_str.lower() or "unavailable" in err_str.lower():
                print(f"[rotator] Binance USDM geoblocked (Error 451/403). Falling back to Bybit...")
                self.exchange = ccxt.bybit({"enableRateLimit": True})
            else:
                print(f"[rotator] Binance USDM init failed ({e}). Falling back to Bybit...")
                self.exchange = ccxt.bybit({"enableRateLimit": True})

    # ──────────────────────────────────────────────────────────────────────
    # Config loading from DB
    # ──────────────────────────────────────────────────────────────────────

    def load_config(self):
        """Hot-reload strategy + risk settings from Neon DB."""
        from database.models.strategy_settings import StrategySettings
        from database.models.risk_settings import RiskSettings
        from database.models.exchange import Exchange

        db = self._db()
        try:
            strat = db.query(StrategySettings).first()
            risk  = db.query(RiskSettings).first()

            if not strat:
                return

            # Build a quick hash to detect changes
            settings_hash = str((
                strat.max_positions, strat.leverage, strat.rotation_threshold,
                strat.atr_sl_mult, strat.entry_thr, strat.min_hold, strat.score_set,
                strat.take_profit_rr, strat.cooldown_scans, strat.timeframe,
                strat.use_ema_filter, strat.alloc_ratio, strat.use_telescoping_leverage,
                strat.use_perf_multipliers, strat.paper_trading, strat.paper_start_balance,
            ))
            if settings_hash == self._last_settings_hash:
                return  # nothing changed

            self._last_settings_hash = settings_hash
            self.telegram_id               = strat.telegram_id
            self.max_positions             = int(strat.max_positions or 4)
            self.leverage                  = float(strat.leverage or 10.0)
            self.rot_boost                 = float(strat.rotation_threshold or 0.3)
            self.atr_sl_mult               = float(strat.atr_sl_mult or 8.0)
            self.entry_thr                 = float(strat.entry_thr or 0.4)
            self.min_hold                  = int(strat.min_hold or 12)
            self.score_set                 = strat.score_set or "balanced_mom"
            self.take_profit_rr            = float(strat.take_profit_rr or 3.0)
            self.cooldown_scans            = int(strat.cooldown_scans or 5)
            self.TIMEFRAME                 = strat.timeframe or "15m"
            self.use_ema_filter            = bool(strat.use_ema_filter)
            self.alloc_ratio               = float(strat.alloc_ratio or 0.25)
            self.use_telescoping_leverage  = bool(strat.use_telescoping_leverage)
            self.use_perf_multipliers      = bool(strat.use_perf_multipliers)
            self.paper_trading             = bool(strat.paper_trading)
            self.paper_start_balance       = float(strat.paper_start_balance or 10.0)

            if risk:
                self.cb_dd                          = float(risk.emergency_stop_pct or 0.35) * 100.0
                self.circuit_breaker_cooldown_scans = int(risk.circuit_breaker_cooldown_scans or 15)
                self.max_pos_dd_mult                = float(risk.max_open_risk or 0.06)

            # Score weights
            score_weights = {
                "trend_0_85_15": (0.0, 0.85, 0.15),
                "mr_100_0_0":    (1.0, 0.0,  0.0),
                "balanced_mom":  (0.1, 0.6,  0.3),
                "pure_supertrend":(0.0, 1.0, 0.0),
            }
            self.W_RSI, self.W_ST, self.W_MOM = score_weights.get(
                self.score_set, (0.0, 0.85, 0.15)
            )

            # Exchange client
            if not self.paper_trading:
                exch = db.query(Exchange).filter(
                    Exchange.active == True,
                    Exchange.telegram_id == self.telegram_id,
                ).first() if self.telegram_id else db.query(Exchange).filter(Exchange.active == True).first()
                if exch:
                    name_clean = exch.name.lower().replace(" ", "").replace("-", "")
                    if hasattr(ccxt, name_clean):
                        ex_class = getattr(ccxt, name_clean)
                        self.exchange = ex_class({
                            "apiKey": exch.api_key,
                            "secret": exch.api_secret,
                            "password": exch.passphrase,
                            "enableRateLimit": True,
                            "options": {"defaultType": "future"},
                        })
                        print(f"[rotator] Live exchange client initialised: {exch.name}")
            else:
                self.init_paper_exchange()

            self.log_event("SETTINGS_RELOADED",
                f"timeframe={self.TIMEFRAME}, max_pos={self.max_positions}, "
                f"leverage={self.leverage}, score_set={self.score_set}, "
                f"paper_trading={self.paper_trading}")
        except Exception as e:
            print(f"[rotator] load_config error: {e}")
        finally:
            db.close()

    # ──────────────────────────────────────────────────────────────────────
    # State persistence (DB)
    # ──────────────────────────────────────────────────────────────────────

    def load_state(self):
        """Resume from the last DB snapshot so a restart doesn't wipe balance."""
        from database.models.rotator_state import RotatorState
        from database.models.trade_history import TradeHistory

        db = self._db()
        try:
            row = db.query(RotatorState).filter(RotatorState.id == 1).first()
            if row and row.snapshot_json:
                snap = json.loads(row.snapshot_json)
                self.balance         = float(snap.get("balance", self.paper_start_balance))
                self.peak_balance    = float(snap.get("peak_balance", self.balance))
                self.open_positions  = snap.get("open_positions", {})
                self.circuit_cooldown = int(snap.get("circuit_cooldown", 0))
                print(f"[rotator] Resumed from DB: balance=${self.balance:.4f}, "
                      f"open_positions={len(self.open_positions)}")
                self.log_event("STATE_LOADED",
                    f"Resumed: balance=${round(self.balance, 4)}, "
                    f"open_positions={len(self.open_positions)}")

            # Count closed trades from DB
            count = db.query(TradeHistory).filter(
                TradeHistory.telegram_id == self.telegram_id
            ).count() if self.telegram_id else db.query(TradeHistory).count()
            self.closed_trades = [None] * count
        except Exception as e:
            print(f"[rotator] load_state error: {e}")
        finally:
            db.close()

    def save_state(self, equity: float, dd: float, candidates=None, running: bool = True):
        """Write the full rotator snapshot to the DB (replaces writing to local JSON file)."""
        from database.models.rotator_state import RotatorState
        from services.rotator_state_reader import update_cached_snapshot, _parse_snapshot

        weakest_symbol = weakest_score = None
        decision = self.last_decision
        candidate_symbol = self.last_candidate_symbol
        candidate_score  = self.last_candidate_score

        if self.open_positions:
            weakest_symbol = min(
                self.open_positions,
                key=lambda s: abs(self.open_positions[s].get("score", 0))
            )
            weakest_score = self.open_positions[weakest_symbol].get("score", 0)

        signals_list = None
        if candidates is not None:
            candidate_symbol = candidate_score = None
            decision = "HOLD"
            for item in candidates:
                if item.get("symbol") not in self.open_positions:
                    candidate_symbol = item.get("symbol")
                    candidate_score  = item.get("score", 0)
                    break
            if candidate_symbol is None and candidates:
                candidate_symbol = candidates[0].get("symbol")
                candidate_score  = candidates[0].get("score", 0)
            if weakest_symbol and candidate_symbol and candidate_symbol != weakest_symbol:
                decision = "ROTATE_NOW"
            self.last_candidate_symbol = candidate_symbol or "-"
            self.last_candidate_score  = candidate_score  or 0.0
            self.last_decision         = decision

            signals_list = [
                {
                    "symbol": c["symbol"], "side": c["direction"],
                    "score": c["score"],   "rank": idx,
                    "st": c["st_score"],   "mom": c["mom_score"],
                }
                for idx, c in enumerate(candidates, start=1)
            ]

        raw_state = {
            "time":           str(datetime.now()),
            "balance":        self.balance,
            "equity":         equity,
            "peak_balance":   self.peak_balance,
            "drawdown_pct":   dd,
            "open_positions": self.open_positions,
            "status": {
                "running":   running,
                "positions": len(self.open_positions),
                "scanner":   ("PAUSED" if not running else ("COOLDOWN" if self.circuit_cooldown > 0 else "ACTIVE")),
                "rotation":  ("PAUSED" if not running else ("PAUSED"   if self.circuit_cooldown > 0 else "ENABLED")),
            },
            "rotation": {
                "current":         weakest_symbol   or "-",
                "current_score":   weakest_score    or 0.0,
                "candidate":       candidate_symbol or "-",
                "candidate_score": candidate_score  or 0.0,
                "advantage":       round(abs(candidate_score or 0.0) - abs(weakest_score or 0.0), 4),
                "decision":        decision,
            },
            "closed_trades":    len(self.closed_trades),
            "circuit_cooldown": self.circuit_cooldown,
            "paper_trading":    self.paper_trading,
            "paper_start_balance": self.paper_start_balance,
        }

        db = self._db()
        try:
            row = db.query(RotatorState).filter(RotatorState.id == 1).first()
            if row:
                row.snapshot_json = json.dumps(raw_state)
                row.signals_json  = json.dumps(signals_list) if signals_list is not None else row.signals_json
                # Keep existing telegram_id; don't overwrite control here
            else:
                row = RotatorState(
                    id=1,
                    snapshot_json=json.dumps(raw_state),
                    signals_json=json.dumps(signals_list) if signals_list else None,
                    telegram_id=self.telegram_id,
                )
                db.add(row)
            db.commit()

            # Update in-memory cache so WebSocket sees it immediately
            db_signals = signals_list
            if db_signals is None and row and row.signals_json:
                try:
                    db_signals = json.loads(row.signals_json)
                except Exception:
                    pass
            parsed = _parse_snapshot(raw_state, db_signals)
            update_cached_snapshot(parsed)
        except Exception as e:
            print(f"[rotator] save_state DB error: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            db.close()

    # ──────────────────────────────────────────────────────────────────────
    # Control channel (DB)
    # ──────────────────────────────────────────────────────────────────────

    def read_and_clear_control(self) -> dict:
        """
        Read the control column from the DB, clear it, and return a dict
        with keys: running (bool), command (str|None).
        Defaults to running=True, command=None if no row / no control set.
        """
        from database.models.rotator_state import RotatorState

        db = self._db()
        try:
            row = db.query(RotatorState).filter(RotatorState.id == 1).first()
            if row is None:
                return {"running": True, "command": None}

            ctrl = row.control
            if ctrl:
                row.control = None  # acknowledge
                db.commit()

            if ctrl == "pause":
                return {"running": False, "command": None}
            elif ctrl == "resume":
                return {"running": True, "command": None}
            elif ctrl in ("exit_all", "rebalance", "reset_balance"):
                return {"running": True, "command": ctrl}
            else:
                # No new command — check the snapshot for running state
                try:
                    snap = json.loads(row.snapshot_json or "{}")
                    running = snap.get("status", {}).get("running", True)
                except Exception:
                    running = True
                return {"running": running, "command": None}
        except Exception as e:
            print(f"[rotator] read_control error: {e}")
            return {"running": True, "command": None}
        finally:
            db.close()

    # ──────────────────────────────────────────────────────────────────────
    # Trade + log persistence
    # ──────────────────────────────────────────────────────────────────────

    def save_trade(self, trade: dict):
        """Persist a closed trade to the trade_history table."""
        from database.models.trade_history import TradeHistory

        db = self._db()
        try:
            row = TradeHistory(
                symbol=trade["symbol"],
                side=trade["direction"],
                entry_price=trade["entry"],
                exit_price=trade["exit"],
                quantity=None,
                pnl=trade["pnl"],
                status="CLOSED",
                reason=trade.get("reason"),
                bars_held=trade.get("bars_held"),
                margin=trade.get("margin"),
                balance=trade.get("balance"),
                telegram_id=trade.get("telegram_id") or self.telegram_id,
                closed_at=datetime.now(tz=timezone.utc),
            )
            db.add(row)
            db.commit()
        except Exception as e:
            print(f"[rotator] save_trade DB error: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            db.close()

    def log_event(self, event_type: str, message: str, severity: str = "INFO"):
        """Write an event to the activity_logs table."""
        from database.models.activity_log import ActivityLog

        db = self._db()
        try:
            row = ActivityLog(
                event_type=event_type,
                message=message,
                severity=severity,
                telegram_id=self.telegram_id,
                timestamp=datetime.now(tz=timezone.utc),
            )
            db.add(row)
            db.commit()
        except Exception as e:
            print(f"[rotator] log_event DB error: {e}")
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            db.close()

    def get_performance_multipliers(self) -> dict:
        """Read recent trade history from DB (replaces CSV read)."""
        from database.models.trade_history import TradeHistory
        from sqlalchemy import and_

        multipliers = {}
        db = self._db()
        try:
            cutoff = datetime.now(tz=timezone.utc).replace(tzinfo=None) 
            # Use naive datetime for comparison compatibility
            import datetime as dt
            cutoff_naive = datetime.utcnow() - dt.timedelta(hours=1)

            q = db.query(TradeHistory).filter(
                TradeHistory.closed_at != None,
                TradeHistory.closed_at >= cutoff_naive,
            )
            if self.telegram_id:
                q = q.filter(TradeHistory.telegram_id == self.telegram_id)
            recent = q.order_by(TradeHistory.closed_at).all()

            # Group by symbol
            from collections import defaultdict
            by_symbol = defaultdict(list)
            for t in recent:
                by_symbol[t.symbol].append(t.pnl or 0.0)

            for symbol, pnls in by_symbol.items():
                last = pnls[-3:]
                pnl_sum = sum(last)
                consec_losses = consec_wins = 0
                for p in reversed(last):
                    if p < 0:
                        if consec_wins > 0: break
                        consec_losses += 1
                    else:
                        if consec_losses > 0: break
                        consec_wins += 1
                mult = 1.0
                if consec_losses >= 2: mult = 0.5
                elif pnl_sum < 0:     mult = 0.75
                if consec_wins >= 2:  mult = 1.3
                elif pnl_sum > 0:     mult = 1.15
                multipliers[symbol] = mult
        except Exception as e:
            print(f"[rotator] get_performance_multipliers error: {e}")
        finally:
            db.close()
        return multipliers

    # ──────────────────────────────────────────────────────────────────────
    # Telegram alerts
    # ──────────────────────────────────────────────────────────────────────

    def send_telegram_alert(self, chat_id: str, text: str):
        token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if not token:
            return
        try:
            requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
                timeout=5,
            )
        except Exception as e:
            print(f"[rotator] Telegram alert failed: {e}")

    def check_market_opportunities(self):
        if not self.telegram_id:
            return
        try:
            candidates = self.scan_market()
            now = time.time()
            for c in candidates:
                if abs(c["score"]) >= 0.75:
                    last = self.notified_symbols.get(c["symbol"], 0.0)
                    if now - last >= 14400.0:
                        self.notified_symbols[c["symbol"]] = now
                        direction = "bullish breakout 📈" if c["score"] > 0 else "bearish breakdown 📉"
                        msg = (
                            f"<b>⚡ SENTRY Market Alert</b>\n\n"
                            f"A promising <b>{direction}</b> on <b>{c['symbol']}</b>\n"
                            f"Score: <b>{c['score']}</b>\n\n"
                            f"Open the SENTRY app to act on this opportunity."
                        )
                        self.send_telegram_alert(self.telegram_id, msg)
                        self.log_event("MARKET_OPPORTUNITY",
                            f"Strong trend on {c['symbol']} (score={c['score']})")
        except Exception as e:
            print(f"[rotator] check_market_opportunities error: {e}")

    # ──────────────────────────────────────────────────────────────────────
    # Self-ping (keeps Render free web service alive)
    # ──────────────────────────────────────────────────────────────────────

    def _self_ping(self):
        now = time.time()
        if now - self._last_self_ping < self.SELF_PING_INTERVAL:
            return
        self._last_self_ping = now
        base_url = os.environ.get("RENDER_EXTERNAL_URL", "")
        if not base_url:
            return
        try:
            requests.get(f"{base_url}/health", timeout=10)
            print("[rotator] Self-ping OK — keeping Render free service alive.")
        except Exception as e:
            print(f"[rotator] Self-ping failed: {e}")

    # ──────────────────────────────────────────────────────────────────────
    # Indicators  (identical to live_paper_rotator.py)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _ema(series, period):
        return series.ewm(span=period, adjust=False).mean()

    @staticmethod
    def _atr(df, period=14):
        hl  = df["high"] - df["low"]
        hc  = (df["high"] - df["close"].shift()).abs()
        lc  = (df["low"]  - df["close"].shift()).abs()
        tr  = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    @staticmethod
    def _rsi(series, period=14):
        delta = series.diff()
        gain  = delta.clip(lower=0)
        loss  = -delta.clip(upper=0)
        ag = gain.ewm(alpha=1/period, adjust=False).mean()
        al = loss.ewm(alpha=1/period, adjust=False).mean()
        rs = ag / (al + 1e-9)
        return 100 - (100 / (1 + rs))

    def _supertrend(self, df, period=10, multiplier=3.0):
        df = df.copy()
        df["atr_st"] = self._atr(df, period)
        hl2 = (df["high"] + df["low"]) / 2
        df["upperband"] = hl2 + multiplier * df["atr_st"]
        df["lowerband"] = hl2 - multiplier * df["atr_st"]

        fu = [0.0] * len(df)
        fl = [0.0] * len(df)
        trend = [1] * len(df)
        st = [0.0] * len(df)

        for i in range(len(df)):
            if i < period:
                fu[i] = fl[i] = st[i] = np.nan
                trend[i] = 1
                continue
            if i == period:
                fu[i] = df["upperband"].iloc[i]
                fl[i] = df["lowerband"].iloc[i]
                st[i] = fl[i]
                continue
            fu[i] = (df["upperband"].iloc[i]
                     if df["upperband"].iloc[i] < fu[i-1] or df["close"].iloc[i-1] > fu[i-1]
                     else fu[i-1])
            fl[i] = (df["lowerband"].iloc[i]
                     if df["lowerband"].iloc[i] > fl[i-1] or df["close"].iloc[i-1] < fl[i-1]
                     else fl[i-1])
            if df["close"].iloc[i] > fu[i-1]:
                trend[i] = 1
            elif df["close"].iloc[i] < fl[i-1]:
                trend[i] = -1
            else:
                trend[i] = trend[i-1]
            st[i] = fl[i] if trend[i] == 1 else fu[i]

        df["supertrend"] = st
        df["st_dir"]     = trend
        df["st_score"]   = np.tanh(
            (df["close"] - df["supertrend"]) / (multiplier * df["atr_st"] + 1e-9)
        )
        return df

    def _add_features(self, df):
        df = df.copy()
        df["rsi_14"]  = self._rsi(df["close"], 14)
        df["ema_200"] = self._ema(df["close"], 200)

        rsi_long  = (30.0 - df["rsi_14"]).clip(lower=0, upper=30.0)
        rsi_short = (df["rsi_14"] - 70.0).clip(lower=0, upper=30.0)
        s_long  = np.where(df["close"] > df["ema_200"], rsi_long  / 30.0, 0.0)
        s_short = np.where(df["close"] < df["ema_200"], rsi_short / 30.0, 0.0)
        df["rsi_score"] = s_long - s_short

        df = self._supertrend(df, 10, 3.0)

        df["ema_fast"]  = self._ema(df["close"], 9)
        df["ema_slow"]  = self._ema(df["close"], 21)
        df["ema_trend"] = self._ema(df["close"], 100)
        df["vol_avg"]   = df["volume"].rolling(20).mean()
        df["boost_vol"] = (df["volume"] / (df["vol_avg"] + 1e-9)).clip(lower=0.5, upper=3.0)
        df["spread"]    = (df["ema_fast"] - df["ema_slow"]) / (df["ema_slow"] + 1e-9)
        df["trend_sign"] = np.where(df["close"] > df["ema_trend"], 1.0, -1.0)
        df["mom_score"] = np.tanh(df["spread"] * 5.0 * df["boost_vol"]) * df["trend_sign"]

        df["composite_score"] = (
            self.W_RSI * df["rsi_score"] +
            self.W_ST  * df["st_score"]  +
            self.W_MOM * df["mom_score"]
        ).clip(-1.0, 1.0)
        df["atr_sl"] = self._atr(df, 14)
        return df

    # ──────────────────────────────────────────────────────────────────────
    # Market data
    # ──────────────────────────────────────────────────────────────────────

    def _normalize(self, sym): return sym.replace("/", "").replace(":USDT", "")

    def _to_ccxt(self, symbol):
        try:
            if not self.exchange.markets:
                self.exchange.load_markets()
            for cs in self.exchange.markets:
                if cs.replace("/", "").replace(":", "").replace("USDT", "") + "USDT" == symbol:
                    return cs
        except Exception:
            pass
        return f"{symbol.replace('USDT', '')}/USDT:USDT"

    def _get_perp_symbols(self):
        markets = self.exchange.load_markets()
        return [
            self._normalize(s)
            for s, m in markets.items()
            if m.get("swap") and m.get("linear") and m.get("quote") == "USDT" and m.get("active")
        ]

    def _fetch_ohlcv(self, symbol):
        cs = self._to_ccxt(symbol)
        candles = self.exchange.fetch_ohlcv(cs, timeframe=self.TIMEFRAME, limit=self.CANDLE_LIMIT)
        df = pd.DataFrame(candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)
        return df

    def _safe_fetch(self, symbol, retries=2):
        for attempt in range(retries):
            try:
                return self._fetch_ohlcv(symbol)
            except Exception as e:
                print(f"[rotator] fetch failed {symbol} attempt {attempt+1}: {e}")
                time.sleep(1)
        return None

    # ──────────────────────────────────────────────────────────────────────
    # Scoring
    # ──────────────────────────────────────────────────────────────────────

    def _score_symbol(self, symbol):
        df = self._safe_fetch(symbol)
        if df is None or len(df) < 220:
            return None
        df = self._add_features(df)
        last = df.iloc[-1]
        if pd.isna(last["atr_sl"]) or last["atr_sl"] <= 0:
            return None
        score = last["composite_score"]
        direction = "LONG" if score > 0 else "SHORT"
        if self.use_ema_filter:
            if direction == "LONG"  and last["close"] < last["ema_trend"]: return None
            if direction == "SHORT" and last["close"] > last["ema_trend"]: return None
        return {
            "symbol":    symbol,
            "score":     round(float(score), 4),
            "direction": direction,
            "price":     float(last["close"]),
            "high":      float(last["high"]),
            "low":       float(last["low"]),
            "atr":       float(last["atr_sl"]),
            "atr_st":    float(last["atr_st"]),
            "st_score":  round(float(last["st_score"]), 4),
            "mom_score": round(float(last["mom_score"]), 4),
            "bar_time":  int(last["timestamp"]),
        }

    def scan_market(self):
        TOP = ["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","ADAUSDT",
               "AVAXUSDT","DOGEUSDT","LINKUSDT","LTCUSDT","TRXUSDT"]
        symbols = [s for s in self._get_perp_symbols() if s in TOP]
        perf = self.get_performance_multipliers() if self.use_perf_multipliers else {}
        candidates = []
        for sym in symbols:
            result = self._score_symbol(sym)
            if not result:
                continue
            mult = perf.get(sym, 1.0)
            if mult != 1.0:
                orig = result["score"]
                if mult < 1.0 and abs(orig) >= 0.70:
                    pass  # breakout bypass
                else:
                    result["score"] = round(orig * mult, 4)
            if abs(result["score"]) >= self.entry_thr:
                candidates.append(result)
        return sorted(candidates, key=lambda x: abs(x["score"]), reverse=True)

    # ──────────────────────────────────────────────────────────────────────
    # Position management  (identical logic to live_paper_rotator.py)
    # ──────────────────────────────────────────────────────────────────────

    def _equity_now(self) -> float:
        if not self.paper_trading:
            try:
                bal = self.exchange.fetch_balance()
                real = bal.get("total", {}).get("USDT")
                if real is not None:
                    return float(real)
            except Exception as e:
                print(f"[rotator] fetch_balance error: {e}")
        equity = self.balance
        for sym, pos in self.open_positions.items():
            df = self._safe_fetch(sym)
            if df is None:
                continue
            price = float(df["close"].iloc[-1])
            entry = pos["entry"]
            ret = ((price - entry) / entry) if pos["direction"] == "LONG" else ((entry - price) / entry)
            lev_pos = pos.get("leverage", self.leverage)
            equity += pos["margin"] + pos["margin"] * lev_pos * ret
        return equity

    def _calc_entry_size(self, equity: float):
        target = equity * self.alloc_ratio
        margin = min(target, self.balance) / (1.0 + self.leverage * self.MAKER_FEE)
        notional = margin * self.leverage
        if margin < 0.5 or notional < 5.0:
            return 0.0, 0.0
        return margin, notional

    def _update_trailing_stop(self, pos, price, high, low, atr_val):
        if pos.get("bars_held", 0) >= 1:
            if pos["direction"] == "LONG":
                pos["peak_price"] = max(pos["peak_price"], high)
                new_stop = pos["peak_price"] - self.atr_sl_mult * atr_val
                pos["trail_stop"] = max(pos["trail_stop"], new_stop)
            else:
                pos["trough_price"] = min(pos["trough_price"], low)
                new_stop = pos["trough_price"] + self.atr_sl_mult * atr_val
                pos["trail_stop"] = min(pos["trail_stop"], new_stop)
        else:
            entry = pos["entry"]
            if pos["direction"] == "LONG":
                pos["trail_stop"] = entry - self.atr_sl_mult * atr_val
            else:
                pos["trail_stop"] = entry + self.atr_sl_mult * atr_val

        # --- Dynamic Breakeven & Profit Locking ---
        direction = pos["direction"]
        entry = pos["entry"]
        risk_dist = self.atr_sl_mult * atr_val
        target_dist = self.take_profit_rr * risk_dist

        if target_dist > 0:
            peak_or_trough = pos["peak_price"] if direction == "LONG" else pos["trough_price"]
            dist_moved = (peak_or_trough - entry) if direction == "LONG" else (entry - peak_or_trough)
            peak_progress = (dist_moved / target_dist) * 100.0

            if peak_progress >= 70.0:
                # Lock in 30% of target profit
                lock_in = entry + (0.30 * target_dist) if direction == "LONG" else entry - (0.30 * target_dist)
                pos["trail_stop"] = max(pos["trail_stop"], lock_in) if direction == "LONG" else min(pos["trail_stop"], lock_in)
            elif peak_progress >= 50.0:
                # Lock in breakeven (entry price)
                pos["trail_stop"] = max(pos["trail_stop"], entry) if direction == "LONG" else min(pos["trail_stop"], entry)

    def open_position(self, candidate):
        symbol    = candidate["symbol"]
        direction = candidate["direction"]
        entry     = candidate["price"]
        atr_val   = candidate["atr"]

        equity = self._equity_now()
        margin, notional = self._calc_entry_size(equity)
        if margin <= 0.0:
            print(f"[rotator] Skipping {symbol}: insufficient size")
            return

        fee = notional * self.MAKER_FEE

        if not self.paper_trading:
            try:
                cs = self._to_ccxt(symbol)
                try:
                    self.exchange.set_leverage(int(self.leverage), cs)
                except Exception as le:
                    print(f"[rotator] set_leverage failed: {le}")
                amount = float(self.exchange.amount_to_precision(cs, notional / entry))
                order  = self.exchange.create_market_order(
                    cs, "buy" if direction == "LONG" else "sell", amount
                )
                self.log_event("LIVE_ORDER_PLACED",
                    f"Real {direction} on {symbol}, order={order.get('id')}")
            except Exception as oe:
                self.log_event("LIVE_ORDER_FAILED", str(oe), "WARNING")
                return

        self.balance -= (margin + fee)

        trail_stop = (entry - self.atr_sl_mult * atr_val if direction == "LONG"
                      else entry + self.atr_sl_mult * atr_val)

        self.open_positions[symbol] = {
            "symbol":      symbol,
            "direction":   direction,
            "entry":       entry,
            "score":       candidate["score"],
            "margin":      margin,
            "notional":    notional,
            "leverage":    self.leverage,
            "trail_stop":  trail_stop,
            "atr":         atr_val,
            "bars_held":   0,
            "opened_at":   str(datetime.now()),
            "peak_price":  entry,
            "trough_price":entry,
            "current_price":entry,
            "pnl":         0.0,
            "pnl_pct":     0.0,
            "progress":    0.0,
        }
        print(f"[rotator] 🚀 OPEN {symbol} {direction} score={candidate['score']} "
              f"entry={round(entry,6)} margin=${round(margin,4)}")
        self.log_event("POSITION_OPEN",
            f"Opened {direction} on {symbol} at {entry}. Margin: ${round(margin,4)}")

    def close_position(self, symbol: str, reason: str, price: float, cooldown_apply: bool = False):
        pos = self.open_positions.pop(symbol)
        direction = pos["direction"]
        entry     = pos["entry"]
        lev       = pos.get("leverage", self.leverage)
        ret = ((price - entry) / entry) if direction == "LONG" else ((entry - price) / entry)
        gross  = pos["margin"] * lev * ret
        fees   = pos["margin"] * lev * self.MAKER_FEE
        fund   = pos["margin"] * lev * self.FUNDING_RATE_8H * (pos["bars_held"] / 32)
        pnl    = gross - fees - fund

        if not self.paper_trading:
            try:
                cs   = self._to_ccxt(symbol)
                side = "sell" if direction == "LONG" else "buy"
                amt  = float(self.exchange.amount_to_precision(cs, pos["notional"] / pos["entry"]))
                order = self.exchange.create_market_order(cs, side, amt)
                self.log_event("LIVE_ORDER_CLOSED",
                    f"Real close on {symbol}, order={order.get('id')}")
            except Exception as ce:
                self.log_event("LIVE_ORDER_CLOSE_FAILED", str(ce), "WARNING")

        self.balance += pos["margin"] + pnl
        if cooldown_apply:
            self.cooldowns[symbol] = self.cooldown_scans

        trade = {
            "symbol":    symbol,
            "direction": direction,
            "entry":     entry,
            "exit":      price,
            "reason":    reason,
            "score":     pos["score"],
            "bars_held": pos["bars_held"],
            "margin":    pos["margin"],
            "pnl":       pnl,
            "balance":   self.balance,
            "telegram_id": self.telegram_id,
        }
        self.closed_trades.append(trade)
        self.save_trade(trade)

        print(f"[rotator] ✅ CLOSE {symbol} {direction} {reason} "
              f"pnl=${round(pnl,4)} balance=${round(self.balance,4)}")
        self.log_event("POSITION_CLOSE",
            f"Closed {symbol} {direction} ({reason}). PnL: ${round(pnl,4)}")

    def close_all_positions(self, reason: str):
        for symbol in list(self.open_positions.keys()):
            df = self._safe_fetch(symbol)
            price = float(df["close"].iloc[-1]) if df is not None else self.open_positions[symbol]["entry"]
            self.close_position(symbol, reason, price)

    def manage_positions(self, latest_scores: list):
        to_close  = []

        for symbol, pos in list(self.open_positions.items()):
            df = self._safe_fetch(symbol)
            if df is None or len(df) < 1:
                continue
            df   = self._add_features(df)
            last = df.iloc[-1]
            price   = float(last["close"])
            high    = float(last["high"])
            low     = float(last["low"])
            atr_val = float(last["atr_sl"]) if "atr_sl" in last else pos["atr"]
            score   = float(last["composite_score"])

            # 1. EMA Trend Filter Check (skip on bar 0 — just opened this scan)
            if self.use_ema_filter and pos.get("bars_held", 0) >= 1:
                if pos["direction"] == "LONG"  and price < last["ema_trend"]:
                    to_close.append((symbol, "TREND_FILTER_EXIT", price, False))
                    continue
                if pos["direction"] == "SHORT" and price > last["ema_trend"]:
                    to_close.append((symbol, "TREND_FILTER_EXIT", price, False))
                    continue

            # 2. Strong Reversal Exit Check (skip on bar 0, Bypasses min_hold otherwise)
            if pos.get("bars_held", 0) >= 1:
                if pos["direction"] == "LONG" and score <= -self.entry_thr:
                    to_close.append((symbol, "STRONG_REVERSAL", price, False))
                    continue
                if pos["direction"] == "SHORT" and score >= self.entry_thr:
                    to_close.append((symbol, "STRONG_REVERSAL", price, False))
                    continue

            pos["bars_held"] += 1
            pos["score"] = score
            self._update_trailing_stop(pos, price, high, low, atr_val)

            direction = pos["direction"]; entry = pos["entry"]; margin = pos["margin"]
            lev = pos.get("leverage", self.leverage)
            ret = ((price - entry) / entry) if direction == "LONG" else ((entry - price) / entry)
            pos["current_price"] = price
            pos["pnl"]     = round(margin * lev * ret, 4)
            pos["pnl_pct"] = round(ret * 100.0, 2)

            risk_dist   = self.atr_sl_mult * pos["atr"]
            target_dist = self.take_profit_rr * risk_dist
            if target_dist > 0:
                prog = (((price - entry) / target_dist) if direction == "LONG"
                        else ((entry - price) / target_dist)) * 100.0
                pos["progress"] = max(0.0, min(100.0, round(prog, 2)))

            # Rule A: hard position drawdown stop
            # max_pos_dd_mult is a fraction of margin (e.g. 0.06 = 6% of margin lost)
            # ret is already (price-entry)/entry, so margin*lev*ret = dollar PnL
            # We close if dollar PnL < -(max_pos_dd_mult * margin)
            max_pos_dd_dollar = -self.max_pos_dd_mult * margin
            dollar_pnl = margin * lev * ret
            if dollar_pnl < max_pos_dd_dollar:
                to_close.append((symbol, "MAX_POS_DD", price, True)); continue

            # Rule B: trailing stop (close at current price, trail_stop is the trigger)
            if direction == "LONG"  and low  <= pos["trail_stop"]:
                to_close.append((symbol, "STOP_LOSS", price, True)); continue
            if direction == "SHORT" and high >= pos["trail_stop"]:
                to_close.append((symbol, "STOP_LOSS", price, True)); continue

            # Rule D: take profit
            if target_dist > 0:
                tp_price = entry + target_dist if direction == "LONG" else entry - target_dist
                if direction == "LONG" and high >= tp_price:
                    to_close.append((symbol, "TAKE_PROFIT", tp_price, True)); continue
                if direction == "SHORT" and low <= tp_price:
                    to_close.append((symbol, "TAKE_PROFIT", tp_price, True)); continue

            # Rule C: normal signal fade (Respects min_hold)
            if pos["bars_held"] >= self.min_hold:
                if direction == "LONG"  and score < 0.0:
                    to_close.append((symbol, "SIGNAL_FADE", price, False)); continue
                if direction == "SHORT" and score > 0.0:
                    to_close.append((symbol, "SIGNAL_FADE", price, False)); continue

        for sym, reason, price, cd in to_close:
            if sym in self.open_positions:
                self.close_position(sym, reason, price, cd)

    def update_prices_realtime(self):
        """DISPLAY-ONLY update every 3 seconds.

        Updates current_price, pnl, pnl_pct and progress for the UI.
        NO exit logic runs here.

        CRITICAL: ticker.high / ticker.low are 24-HOUR values from the exchange,
        not the current candle range. Using them for stop/TP checks causes
        instant false exits every time a position is opened. All exit decisions
        (STOP_LOSS, TAKE_PROFIT, TREND_FILTER_EXIT, etc.) run exclusively in
        manage_positions() every 60 s using real OHLC candle data.
        """
        if not self.open_positions:
            return
        try:
            ccxt_syms = [self._to_ccxt(s) for s in self.open_positions]
            tickers   = self.exchange.fetch_tickers(ccxt_syms)

            for sym, pos in list(self.open_positions.items()):
                t = tickers.get(self._to_ccxt(sym))
                if not t:
                    continue
                price = t.get("last") or t.get("close")
                if not price:
                    continue

                pos["current_price"] = price
                direction = pos["direction"]
                entry     = pos["entry"]
                margin    = pos["margin"]
                lev       = pos.get("leverage", self.leverage)
                ret       = ((price - entry) / entry) if direction == "LONG" else ((entry - price) / entry)
                pos["pnl"]     = round(margin * lev * ret, 4)
                pos["pnl_pct"] = round(ret * 100.0, 2)

                risk_dist   = self.atr_sl_mult * pos["atr"]
                target_dist = self.take_profit_rr * risk_dist
                if target_dist > 0:
                    prog = (((price - entry) / target_dist) if direction == "LONG"
                            else ((entry - price) / target_dist)) * 100.0
                    pos["progress"] = max(0.0, min(100.0, round(prog, 2)))

            equity = self.balance + sum(
                p["margin"] + p.get("pnl", 0.0) for p in self.open_positions.values()
            )
            self.peak_balance = max(self.peak_balance, equity)
            dd = (self.peak_balance - equity) / self.peak_balance if self.peak_balance > 0 else 0.0
            self.save_state(equity, dd * 100.0, candidates=None)
        except Exception as e:
            print(f"[rotator] realtime price update error: {e}")


    def rotate_positions(self, candidates: list):
        valid = [c for c in candidates
                 if c["symbol"] not in self.open_positions
                 and self.cooldowns.get(c["symbol"], 0) == 0]
        # Fill open slots
        while len(self.open_positions) < self.max_positions and valid:
            self.open_position(valid.pop(0))
        if len(self.open_positions) < self.max_positions:
            return
        # Rotation: replace weakest
        eligible = []
        for s, p in self.open_positions.items():
            if p.get("bars_held", 0) < self.min_hold:
                continue
            eligible.append((s, p))
        if not eligible or not valid:
            return
        weakest_sym, weakest_pos = min(eligible, key=lambda x: abs(x[1].get("score", 0)))
        best = valid[0]
        if abs(best["score"]) > abs(weakest_pos["score"]) + self.rot_boost:
            print(f"[rotator] 🔁 ROTATE {weakest_sym} → {best['symbol']}")
            df = self._safe_fetch(weakest_sym)
            exit_price = float(df["close"].iloc[-1]) if df is not None else weakest_pos["entry"]
            self.close_position(weakest_sym, "ROTATION", exit_price)
            self.open_position(best)

    def check_circuit_breaker(self):
        equity = self._equity_now()
        if self.circuit_cooldown > 0:
            if self.open_positions:
                self.close_all_positions("CIRCUIT_BREAKER")
            return equity, 0.0
        self.peak_balance = max(self.peak_balance, equity)
        dd = (self.peak_balance - equity) / self.peak_balance if self.peak_balance > 0 else 0.0
        threshold = self.cb_dd / 100.0 if self.cb_dd >= 1.0 else self.cb_dd
        if dd >= threshold:
            print(f"[rotator] 🛑 CIRCUIT BREAKER: dd={round(dd*100,2)}%")
            self.log_event("CIRCUIT_BREAKER_HIT",
                f"Circuit breaker: dd={round(dd*100,2)}% >= {round(threshold*100,2)}%",
                "WARNING")
            self.close_all_positions("CIRCUIT_BREAKER")
            self.circuit_cooldown = self.circuit_breaker_cooldown_scans
        return equity, dd * 100.0

    # ──────────────────────────────────────────────────────────────────────
    # Main loop
    # ──────────────────────────────────────────────────────────────────────

    def run(self):
        print("[rotator] ===== SENTRY CLOUD ROTATOR STARTING =====")
        self.load_config()
        self.load_state()
        self.log_event("SYSTEM_START", "Cloud rotator engine started (DB-wired, no local files)")

        last_scan_time     = 0.0
        last_realtime_time = 0.0
        last_paused_scan   = 0.0
        running            = True

        while self.alive:
            try:
                # ── Self-ping to keep Render free service alive ──────────
                self._self_ping()

                # ── Read + act on control commands ───────────────────────
                ctrl    = self.read_and_clear_control()
                running = ctrl["running"]
                command = ctrl["command"]

                if command == "exit_all":
                    print("[rotator] EXIT ALL triggered")
                    self.log_event("EXIT_ALL_TRIGGERED", "Manual exit-all command received")
                    self.close_all_positions("EXPLICIT_EXIT")
                    running = False

                elif command == "rebalance":
                    print("[rotator] REBALANCE triggered")
                    self.log_event("REBALANCE_TRIGGERED", "Forced rebalance cycle")
                    last_scan_time = 0.0

                elif command == "reset_balance":
                    print("[rotator] RESET BALANCE triggered")
                    self.load_config()
                    self.close_all_positions("BALANCE_RESET")
                    self.balance      = self.paper_start_balance
                    self.peak_balance = self.paper_start_balance
                    self.closed_trades = []
                    self.log_event("BALANCE_RESET", f"Paper balance reset to ${self.paper_start_balance}")
                    last_scan_time = 0.0

                # ── Paused / idle ─────────────────────────────────────────
                if not running:
                    equity = self._equity_now()
                    self.save_state(equity, 0.0, running=False)
                    now = time.time()
                    if now - last_paused_scan >= 300.0:
                        last_paused_scan = now
                        self.load_config()
                        self.check_market_opportunities()
                    time.sleep(1)
                    continue

                # ── Hot-reload config ─────────────────────────────────────
                self.load_config()

                # ── Telescoping leverage ──────────────────────────────────
                if self.use_telescoping_leverage:
                    equity = self.balance + sum(
                        p["margin"] + p.get("pnl", 0.0)
                        for p in self.open_positions.values()
                    )
                    target_lev = 20.0 if equity < 50 else (10.0 if equity < 500 else 3.0)
                    if target_lev != self.leverage:
                        self.leverage = self.last_telescoped_leverage = target_lev
                        self.log_event("LEVERAGE_ADJUSTED",
                            f"Telescoping → {self.leverage}x (equity=${round(equity,2)})")

                now = time.time()

                # ── Main scan loop (every LOOP_SECONDS) ──────────────────
                if now - last_scan_time >= self.LOOP_SECONDS:
                    # Decrement cooldowns
                    for sym in list(self.cooldowns):
                        self.cooldowns[sym] -= 1
                        if self.cooldowns[sym] <= 0:
                            self.cooldowns.pop(sym)
                    if self.circuit_cooldown > 0:
                        self.circuit_cooldown -= 1
                        if self.circuit_cooldown == 0:
                            self.peak_balance = self._equity_now()

                    equity, dd = self.check_circuit_breaker()

                    if self.circuit_cooldown > 0:
                        print(f"[rotator] ⏳ Cooldown: {self.circuit_cooldown} bars left")
                        self.save_state(equity, dd)
                    else:
                        candidates = self.scan_market()
                        self.manage_positions(candidates)
                        self.rotate_positions(candidates)
                        equity, dd = self.check_circuit_breaker()
                        self.save_state(equity, dd, candidates)

                        print(f"\n[rotator] ===== STATUS =====")
                        print(f"  Balance:    ${round(self.balance, 4)}")
                        print(f"  Equity:     ${round(equity, 4)}")
                        print(f"  Drawdown:   {round(dd, 2)}%")
                        print(f"  Positions:  {len(self.open_positions)}/{self.max_positions}")
                        print(f"  Top signal: {candidates[0]['symbol'] if candidates else '-'}")

                    last_scan_time = last_realtime_time = now

                # ── Real-time price updates every 3 s ────────────────────
                elif now - last_realtime_time >= 3.0:
                    self.update_prices_realtime()
                    last_realtime_time = now

                time.sleep(1)

            except KeyboardInterrupt:
                print("[rotator] KeyboardInterrupt — stopping.")
                self.alive = False
            except Exception as e:
                print(f"[rotator] Main loop error: {e}")
                time.sleep(5)
