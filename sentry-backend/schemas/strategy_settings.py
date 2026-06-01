from pydantic import BaseModel

class StrategySettingsPayload(BaseModel):
    max_positions: int
    risk_per_trade: float
    leverage: int
    rotation_threshold: float
    stop_loss_pct: float
    take_profit_rr: float
    auto_rotation: bool
    cooldown_scans: int = 5
    timeframe: str = "15m"
    atr_sl_mult: float = 8.0
    entry_thr: float = 0.4
    min_hold: int = 12
    score_set: str = "balanced_mom"
    use_ema_filter: bool = True
    alloc_ratio: float = 0.25
    use_telescoping_leverage: bool = False
    profile: str = "balanced"
    use_perf_multipliers: bool = False
    paper_trading: bool = True
    paper_start_balance: float = 10.0
    use_ml_filter: bool = False
    ml_prob_thr: float = 0.55




