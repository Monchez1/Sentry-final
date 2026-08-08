"""
backtest.py

Highly-optimized historical backtesting script for SENTRY.
Converts DataFrame data to NumPy arrays to speed up simulation grid searches.
"""
import os
import time
import pandas as pd
import numpy as np
import ccxt

# ---------------------------------------------------------------------------
# Technical Indicator Calculations (Identical to rotator_engine.py)
# ---------------------------------------------------------------------------
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / (loss + 1e-9)
    return 100 - (100 / (1 + rs))

def calculate_ema(series, period):
    return series.ewm(span=period, adjust=False).mean()

def calculate_atr(df, period=14):
    high_low = df["high"] - df["low"]
    high_close = np.abs(df["high"] - df["close"].shift())
    low_close = np.abs(df["low"] - df["close"].shift())
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = ranges.max(axis=1)
    return true_range.rolling(window=period).mean()

def calculate_supertrend(df, period=10, multiplier=3.0):
    df = df.copy()
    atr_st = calculate_atr(df, period)
    hl2 = (df["high"] + df["low"]) / 2
    upperband = hl2 + multiplier * atr_st
    lowerband = hl2 - multiplier * atr_st

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
            fu[i] = upperband.iloc[i]
            fl[i] = lowerband.iloc[i]
            st[i] = fl[i]
            continue
        
        fu[i] = upperband.iloc[i] if upperband.iloc[i] < fu[i-1] or df["close"].iloc[i-1] > fu[i-1] else fu[i-1]
        fl[i] = lowerband.iloc[i] if lowerband.iloc[i] > fl[i-1] or df["close"].iloc[i-1] < fl[i-1] else fl[i-1]
        
        if df["close"].iloc[i] > fu[i-1]:
            trend[i] = 1
        elif df["close"].iloc[i] < fl[i-1]:
            trend[i] = -1
        else:
            trend[i] = trend[i-1]
        st[i] = fl[i] if trend[i] == 1 else fu[i]

    df["supertrend"] = st
    df["st_dir"]     = trend
    df["st_score"]   = np.tanh((df["close"] - df["supertrend"]) / (multiplier * atr_st + 1e-9))
    df["atr_st"]     = atr_st
    return df

def precompute_base_features(df, correct_mom_sign=True):
    df = df.copy()
    df["rsi_14"]  = calculate_rsi(df["close"], 14)
    df["ema_200"] = calculate_ema(df["close"], 200)

    rsi_long  = (30.0 - df["rsi_14"]).clip(lower=0, upper=30.0)
    rsi_short = (df["rsi_14"] - 70.0).clip(lower=0, upper=30.0)
    s_long  = np.where(df["close"] > df["ema_200"], rsi_long  / 30.0, 0.0)
    s_short = np.where(df["close"] < df["ema_200"], rsi_short / 30.0, 0.0)
    df["rsi_score"] = s_long - s_short

    df = calculate_supertrend(df, 10, 3.0)

    df["ema_fast"]  = calculate_ema(df["close"], 9)
    df["ema_slow"]  = calculate_ema(df["close"], 21)
    df["ema_trend"] = calculate_ema(df["close"], 100)
    df["vol_avg"]   = df["volume"].rolling(20).mean()
    df["boost_vol"] = (df["volume"] / (df["vol_avg"] + 1e-9)).clip(lower=0.5, upper=3.0)
    df["spread"]    = (df["ema_fast"] - df["ema_slow"]) / (df["ema_slow"] + 1e-9)
    
    if correct_mom_sign:
        df["mom_score"] = np.tanh(df["spread"] * 5.0 * df["boost_vol"])
    else:
        df["trend_sign"] = np.where(df["close"] > df["ema_trend"], 1.0, -1.0)
        df["mom_score"] = np.tanh(df["spread"] * 5.0 * df["boost_vol"]) * df["trend_sign"]

    df["atr_sl"] = calculate_atr(df, 14)
    return df

# ---------------------------------------------------------------------------
# Data Fetcher
# ---------------------------------------------------------------------------
def fetch_historical_data(timeframe="15m", limit=1500):
    TOP_10 = ["BTC/USDT:USDT", "ETH/USDT:USDT", "SOL/USDT:USDT", "XRP/USDT:USDT", "ADA/USDT:USDT",
              "AVAX/USDT:USDT", "DOGE/USDT:USDT", "LINK/USDT:USDT", "LTC/USDT:USDT", "TRX/USDT:USDT"]
    
    exchange = ccxt.binanceusdm({"enableRateLimit": True})
    data = {}
    
    print(f"Fetching {limit} {timeframe} candles for Top 10 perps...")
    for sym in TOP_10:
        try:
            symbol_clean = sym.replace("/", "").split(":")[0]
            candles = exchange.fetch_ohlcv(sym, timeframe=timeframe, limit=limit)
            df = pd.DataFrame(candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
            for col in ["open", "high", "low", "close", "volume"]:
                df[col] = df[col].astype(float)
            data[symbol_clean] = df
            time.sleep(0.15)
        except Exception as e:
            print(f"Error downloading {sym}: {e}")
    return data

# ---------------------------------------------------------------------------
# Core NumPy Backtest Engine
# ---------------------------------------------------------------------------
def run_simulation(precomputed_dict, settings):
    start_balance = settings["start_balance"]
    leverage = settings["leverage"]
    alloc_ratio = settings["alloc_ratio"]
    max_positions = settings["max_positions"]
    atr_sl_mult = settings["atr_sl_mult"]
    take_profit_rr = settings["take_profit_rr"]
    entry_thr = settings["entry_thr"]
    use_ema_filter = settings["use_ema_filter"]
    use_partial_tp = settings["use_partial_tp"]
    use_progressive_stops = settings["use_progressive_stops"]
    use_tighter_trail = settings["use_tighter_trail"]
    w_rsi, w_st, w_mom = settings["weights"]
    
    maker_fee = 0.02 / 100
    taker_fee = 0.05 / 100
    slippage = 0.03 / 100
    entry_cost_rate = taker_fee + slippage
    exit_cost_rate = taker_fee + slippage
    
    # Pre-extract NumPy arrays for maximum speed
    sym_names = list(precomputed_dict.keys())
    data_arrays = {}
    
    min_len = 999999
    for sym in sym_names:
        df = precomputed_dict[sym]
        min_len = min(min_len, len(df))
        
        # Calculate composite score once (vectorised)
        comp_score = (
            w_rsi * df["rsi_score"].values +
            w_st  * df["st_score"].values  +
            w_mom * df["mom_score"].values
        ).clip(-1.0, 1.0)
        
        data_arrays[sym] = {
            "high": df["high"].values,
            "low": df["low"].values,
            "close": df["close"].values,
            "atr_sl": df["atr_sl"].values,
            "ema_trend": df["ema_trend"].values,
            "composite_score": comp_score
        }
        
    balance = start_balance
    peak_balance = start_balance
    open_positions = {}
    trades = []
    
    for i in range(220, min_len):
        # Update prices & evaluate exits
        closed_syms = []
        for sym, pos in list(open_positions.items()):
            arr = data_arrays[sym]
            high = arr["high"][i]
            low = arr["low"][i]
            close = arr["close"][i]
            atr = arr["atr_sl"][i]
            
            direction = pos["direction"]
            entry = pos["entry"]
            risk_dist = atr_sl_mult * pos["atr"]
            target_dist = take_profit_rr * risk_dist
            
            if direction == "LONG":
                pos["peak_price"] = max(pos["peak_price"], high)
                peak_or_trough = pos["peak_price"]
            else:
                pos["trough_price"] = min(pos["trough_price"], low)
                peak_or_trough = pos["trough_price"]
                
            if target_dist > 0:
                dist_moved = (peak_or_trough - entry) if direction == "LONG" else (entry - peak_or_trough)
                peak_progress = (dist_moved / target_dist) * 100.0
            else:
                peak_progress = 0.0
                
            exit_triggered = False
            exit_type = ""
            exit_price = close
            
            if target_dist > 0:
                tp_price = entry + target_dist if direction == "LONG" else entry - target_dist
                if direction == "LONG" and high >= tp_price:
                    exit_triggered = True
                    exit_type = "TAKE_PROFIT"
                    exit_price = tp_price
                elif direction == "SHORT" and low <= tp_price:
                    exit_triggered = True
                    exit_type = "TAKE_PROFIT"
                    exit_price = tp_price
                    
            if not exit_triggered and use_partial_tp and target_dist > 0 and not pos.get("partial_tp_done"):
                one_r_price = entry + risk_dist if direction == "LONG" else entry - risk_dist
                hit_one_r = (high >= one_r_price) if direction == "LONG" else (low <= one_r_price)
                if hit_one_r:
                    pos["partial_tp_done"] = True
                    half_margin = pos["margin"] * 0.5
                    half_notional = pos["notional"] * 0.5
                    half_ret = ((one_r_price - entry) / entry) if direction == "LONG" else ((entry - one_r_price) / entry)
                    partial_pnl = (half_margin * leverage * half_ret) - (half_notional * entry_cost_rate)
                    balance += half_margin + partial_pnl
                    pos["margin"] = half_margin
                    pos["notional"] = half_notional
                    
            if not exit_triggered:
                trail_mult = atr_sl_mult
                if use_tighter_trail:
                    if peak_progress >= 75.0:
                        trail_mult = atr_sl_mult * 0.40
                    elif peak_progress >= 50.0:
                        trail_mult = atr_sl_mult * 0.55
                    elif peak_progress >= 25.0:
                        trail_mult = atr_sl_mult * 0.75
                
                if use_progressive_stops and target_dist > 0:
                    if peak_progress >= 90.0:
                        lock_pct = 0.70
                    elif peak_progress >= 75.0:
                        lock_pct = 0.50
                    elif peak_progress >= 50.0:
                        lock_pct = 0.25
                    elif peak_progress >= 25.0:
                        lock_pct = 0.0
                    else:
                        lock_pct = None
                        
                    if lock_pct is not None:
                        lock_price = entry + lock_pct * target_dist if direction == "LONG" else entry - lock_pct * target_dist
                        if direction == "LONG":
                            pos["trail_stop"] = max(pos["trail_stop"], lock_price)
                        else:
                            pos["trail_stop"] = min(pos["trail_stop"], lock_price)
                
                new_stop = pos["peak_price"] - trail_mult * atr if direction == "LONG" else pos["trough_price"] + trail_mult * atr
                if direction == "LONG":
                    pos["trail_stop"] = max(pos["trail_stop"], new_stop)
                else:
                    pos["trail_stop"] = min(pos["trail_stop"], new_stop)
                    
                if direction == "LONG" and low <= pos["trail_stop"]:
                    exit_triggered = True
                    exit_type = "STOP_LOSS"
                    exit_price = max(pos["trail_stop"], low)
                elif direction == "SHORT" and high >= pos["trail_stop"]:
                    exit_triggered = True
                    exit_type = "STOP_LOSS"
                    exit_price = min(pos["trail_stop"], high)
                    
            if exit_triggered:
                ret = ((exit_price - entry) / entry) if direction == "LONG" else ((entry - exit_price) / entry)
                gross_pnl = pos["margin"] * leverage * ret
                fee_drag = pos["notional"] * exit_cost_rate
                net_pnl = gross_pnl - fee_drag
                balance += pos["margin"] + net_pnl
                
                trades.append({
                    "symbol": sym,
                    "net_pnl": net_pnl,
                    "margin": pos["margin"]
                })
                closed_syms.append(sym)
                
        for sym in closed_syms:
            open_positions.pop(sym)
            
        # Scan & Rotate
        if len(open_positions) < max_positions:
            candidates = []
            for sym in sym_names:
                if sym in open_positions:
                    continue
                arr = data_arrays[sym]
                score = arr["composite_score"][i]
                close_price = arr["close"][i]
                ema_trend = arr["ema_trend"][i]
                atr = arr["atr_sl"][i]
                direction = "LONG" if score > 0 else "SHORT"
                
                if use_ema_filter:
                    if direction == "LONG" and close_price < ema_trend: continue
                    if direction == "SHORT" and close_price > ema_trend: continue
                    
                if abs(score) >= entry_thr:
                    candidates.append({
                        "symbol": sym, "score": score, "direction": direction, "price": close_price, "atr": atr
                    })
            
            candidates = sorted(candidates, key=lambda x: abs(x["score"]), reverse=True)
            for cand in candidates:
                if len(open_positions) >= max_positions:
                    break
                sym = cand["symbol"]
                margin = min(balance * alloc_ratio, balance)
                if margin <= 0.50:
                    break
                
                notional = margin * leverage
                fee_cost = notional * entry_cost_rate
                balance -= (margin + fee_cost)
                
                open_positions[sym] = {
                    "symbol": sym,
                    "direction": cand["direction"],
                    "entry": cand["price"],
                    "margin": margin,
                    "notional": notional,
                    "peak_price": cand["price"],
                    "trough_price": cand["price"],
                    "trail_stop": cand["price"] - atr_sl_mult * cand["atr"] if cand["direction"] == "LONG" else cand["price"] + atr_sl_mult * cand["atr"],
                    "atr": cand["atr"],
                    "partial_tp_done": False
                }
                
        current_equity = balance + sum(p["margin"] for p in open_positions.values())
        peak_balance = max(peak_balance, current_equity)
        if current_equity <= 0.10:
            balance = 0.0
            break
            
    final_equity = balance + sum(p["margin"] for p in open_positions.values())
    pnl_pct = ((final_equity - start_balance) / start_balance) * 100
    max_dd = ((peak_balance - final_equity) / peak_balance) * 100 if peak_balance > 0 else 0.0
    
    win_rate = 0.0
    if trades:
        win_rate = (sum(1 for t in trades if t["net_pnl"] > 0) / len(trades)) * 100
        
    return {
        "pnl_pct": pnl_pct,
        "win_rate": win_rate,
        "trades_count": len(trades),
        "max_dd": max_dd
    }

# ---------------------------------------------------------------------------
# Grid Search Optimizer
# ---------------------------------------------------------------------------
def run_optimization(data_15m, data_1h):
    print("Pre-computing base features...")
    # Pre-compute both standard and fixed momentum features
    precomputed_15m_fixed = {s: precompute_base_features(df, correct_mom_sign=True) for s, df in data_15m.items()}
    precomputed_1h_fixed  = {s: precompute_base_features(df, correct_mom_sign=True) for s, df in data_1h.items()}
    
    precomputed_15m_inverted = {s: precompute_base_features(df, correct_mom_sign=False) for s, df in data_15m.items()}
    precomputed_1h_inverted  = {s: precompute_base_features(df, correct_mom_sign=False) for s, df in data_1h.items()}
    
    print("\nStarting Grid Search Optimization to find profitable configurations...")
    
    # Define Parameter Grid
    timeframes = [
        ("15m (Fixed Momentum)", precomputed_15m_fixed),
        ("1h (Fixed Momentum)", precomputed_1h_fixed),
        ("15m (Inverted Momentum)", precomputed_15m_inverted),
        ("1h (Inverted Momentum)", precomputed_1h_inverted)
    ]
    leverages = [5, 10]
    alloc_ratios = [0.20, 0.25]
    atr_sl_mults = [6.0, 8.0, 10.0]
    take_profit_rrs = [1.5, 2.0, 3.0, 4.0]
    entry_thrs = [0.35, 0.45]
    weight_sets = [
        ("balanced_mom", (0.1, 0.6, 0.3)),
        ("mom_focused", (0.05, 0.35, 0.60)),
        ("rsi_focused", (0.50, 0.20, 0.30)),
        ("trend_rsi", (0.30, 0.50, 0.20))
    ]
    
    best_results = []
    start_time = time.time()
    total_runs = 0
    
    for tf_label, precomputed in timeframes:
        for lev in leverages:
            for alloc in alloc_ratios:
                for atr in atr_sl_mults:
                    for rr in take_profit_rrs:
                        for thr in entry_thrs:
                            for w_name, weights in weight_sets:
                                total_runs += 1
                                settings = {
                                    "start_balance": 1000.0,
                                    "leverage": lev,
                                    "alloc_ratio": alloc,
                                    "max_positions": 1,
                                    "atr_sl_mult": atr,
                                    "take_profit_rr": rr,
                                    "entry_thr": thr,
                                    "use_ema_filter": True,
                                    "use_partial_tp": True,
                                    "use_progressive_stops": True,
                                    "use_tighter_trail": True,
                                    "weights": weights
                                }
                                
                                res = run_simulation(precomputed, settings)
                                if res["pnl_pct"] > 0:
                                    best_results.append({
                                        "timeframe": tf_label,
                                        "leverage": lev,
                                        "alloc": alloc,
                                        "atr": atr,
                                        "rr": rr,
                                        "thr": thr,
                                        "weights_name": w_name,
                                        "pnl_pct": res["pnl_pct"],
                                        "win_rate": res["win_rate"],
                                        "trades": res["trades_count"],
                                        "max_dd": res["max_dd"]
                                    })
                                    
    elapsed = time.time() - start_time
    print(f"Completed {total_runs} simulations in {elapsed:.2f}s.")
    
    best_results = sorted(best_results, key=lambda x: x["pnl_pct"], reverse=True)
    
    print("\n" + "="*80)
    print("                     TOP 5 PROFITABLE BACKTEST SETUPS")
    print("="*80)
    if not best_results:
        print("No profitable configurations found under the search space.")
    else:
        for idx, r in enumerate(best_results[:5]):
            print(f"\nRANK #{idx+1}: Return = +{r['pnl_pct']:.2f}% | Win Rate = {r['win_rate']:.1f}% | Trades = {r['trades']}")
            print(f"  Parameters: TF={r['timeframe']} | StopMultiplier={r['atr']}x ATR | Target={r['rr']}R | EntryThreshold={r['thr']}")
            print(f"  Risk Profile: Leverage={r['leverage']}x | Allocation={r['alloc']*100:.0f}% | MaxDrawdown={r['max_dd']:.2f}%")
            print(f"  Weights Set: {r['weights_name']}")
    print("="*80)

if __name__ == "__main__":
    data_15m = fetch_historical_data("15m", 1500)
    data_1h  = fetch_historical_data("1h", 1500)
    
    run_optimization(data_15m, data_1h)
