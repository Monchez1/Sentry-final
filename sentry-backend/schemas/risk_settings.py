from pydantic import BaseModel

class RiskSettingsPayload(BaseModel):
    max_daily_drawdown: float
    max_open_risk: float
    max_consecutive_losses: int
    emergency_stop_pct: float
    circuit_breaker_enabled: bool
    circuit_breaker_cooldown_scans: int = 15

