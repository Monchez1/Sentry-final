import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Production: set DATABASE_URL env var to your Neon/Supabase PostgreSQL URL
# Local dev: falls back to the local PostgreSQL instance
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://sentry_user:StrongPassword123@localhost/sentry"
)

# Render/Neon provides postgres:// URLs — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
