#!/bin/bash
set -e

echo "Initializing database..."
python init_db.py

echo "Running migrations..."
python migrate_custom_settings.py

echo "Starting Uvicorn web server..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT
