from pydantic import BaseModel

class ExchangeCreate(BaseModel):
    name: str
    api_key: str
    api_secret: str
    passphrase: str | None = None

class ExchangeOut(BaseModel):
    id: int
    name: str
    active: bool

    class Config:
        from_attributes = True
