from pydantic import BaseModel

class NotificationSettingsPayload(BaseModel):
    trade_executions: bool
    daily_reports: bool
    system_outages: bool
    cooldown_locks: bool
