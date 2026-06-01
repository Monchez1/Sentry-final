import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv
load_dotenv()

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.config import engine

def main():
    print("Connecting to database and running ML columns migration...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS use_ml_filter BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE strategy_settings ADD COLUMN IF NOT EXISTS ml_prob_thr DOUBLE PRECISION DEFAULT 0.55;"))
            conn.commit()
            print("✅ Columns 'use_ml_filter' and 'ml_prob_thr' successfully verified/added to 'strategy_settings' table!")
        except Exception as e:
            print(f"❌ Migration error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
