from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Boolean

from database.base import Base

class Exchange(Base):
    __tablename__ = "exchanges"

    id = Column(Integer, primary_key=True)

    name = Column(String, nullable=False)

    api_key = Column(String, nullable=False)

    api_secret = Column(String, nullable=False)

    passphrase = Column(String)

    active = Column(Boolean, default=True)

    telegram_id = Column(String, nullable=True)

