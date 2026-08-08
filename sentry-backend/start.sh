#!/bin/bash
set -e

echo "Running migrations..."
python migrate_custom_settings.py

echo "Initializing database..."
python init_db.py

echo "Starting Uvicorn web server..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT
