import os
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL is not set!")
    exit(1)

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print("Connecting to PostgreSQL to run migrations...")
engine = create_engine(db_url)

columns_to_add = [
    ("custom_w_rsi", "DOUBLE PRECISION", "0.10"),
    ("custom_w_st", "DOUBLE PRECISION", "0.60"),
    ("custom_w_mom", "DOUBLE PRECISION", "0.30"),
    ("st_period", "INTEGER", "10"),
    ("st_mult", "DOUBLE PRECISION", "3.0"),
    ("ema_trend_period", "INTEGER", "100")
]

with engine.connect() as conn:
    for col_name, col_type, default_val in columns_to_add:
        try:
            # Check if column exists
            query = text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='strategy_settings' AND column_name='{col_name}';
            """)
            res = conn.execute(query).fetchone()
            if not res:
                print(f"Adding column '{col_name}'...")
                conn.execute(text(f"ALTER TABLE strategy_settings ADD COLUMN {col_name} {col_type} DEFAULT {default_val};"))
                conn.commit()
                print(f"✓ Column '{col_name}' added successfully.")
            else:
                print(f"Column '{col_name}' already exists.")
        except Exception as e:
            print(f"Error adding '{col_name}': {e}")

print("Migration completed.")
