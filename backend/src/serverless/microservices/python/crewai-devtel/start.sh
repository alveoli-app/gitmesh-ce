#!/bin/bash
# Start DevTel CrewAI Service
# Usage: ./start.sh [--dev]

set -e

cd "$(dirname "$0")"

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -d "venv" ] || [ "$1" == "--install" ]; then
    echo "Installing dependencies..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Development mode with auto-reload
if [ "$1" == "--dev" ]; then
    echo "Starting in development mode..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Starting CrewAI service..."
    python -m app.main
fi
