# DevSpace Makefile
# Unified commands for development and deployment

.PHONY: help dev dev-setup dev-backend dev-frontend dev-chat test lint format clean

# Default target
help:
	@echo "DevSpace Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Setup:"
	@echo "  make dev-setup        Install all dependencies"
	@echo "  make chat-setup       Setup chat-orchestrator Python env"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start in Community Edition (CE) mode"
	@echo "  make dev-ee           Start in Enterprise Edition (EE) mode"
	@echo "  make dev-backend      Start backend only"
	@echo "  make dev-frontend     Start frontend only"
	@echo "  make dev-chat         Start chat-orchestrator only"
	@echo ""
	@echo "Testing:"
	@echo "  make test             Run all tests"
	@echo "  make test-backend     Run backend tests"
	@echo "  make test-chat        Run chat-orchestrator tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             Run linters"
	@echo "  make format           Format code"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     Build all Docker images"
	@echo "  make docker-up        Start all services with Docker Compose"
	@echo "  make docker-down      Stop Docker Compose services"

# ======================
# Setup Commands
# ======================

dev-setup: backend-deps frontend-deps chat-setup
	@echo "✅ All dependencies installed"

backend-deps:
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install

frontend-deps:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

chat-setup:
	@echo "🐍 Setting up chat-orchestrator Python environment..."
	cd chat-orchestrator && python3 -m venv venv || python -m venv venv
	cd chat-orchestrator && . venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Python environment ready"
	@echo "⚠️  Don't forget to set OPENAI_API_KEY in chat-orchestrator/.env"

# ======================
# Development Commands
# ======================

dev:
	@./scripts/dev.sh --ce

dev-ee:
	@./scripts/dev.sh --ee

dev-backend:
	@echo "🔧 Starting backend..."
	cd backend && npm run start:api:dev:local

dev-frontend:
	@echo "🌐 Starting frontend..."
	cd frontend && npm run dev

dev-chat:
	@echo "🤖 Starting chat-orchestrator..."
	cd chat-orchestrator && . venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# ======================
# Testing Commands
# ======================

test: test-backend test-chat
	@echo "✅ All tests passed"

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && npm test

test-chat:
	@echo "🧪 Running chat-orchestrator tests..."
	cd chat-orchestrator && . venv/bin/activate && pytest

# ======================
# Code Quality Commands
# ======================

lint:
	@echo "🔍 Linting backend..."
	cd backend && npm run lint
	@echo "🔍 Linting frontend..."
	cd frontend && npm run lint
	@echo "🔍 Linting chat-orchestrator..."
	cd chat-orchestrator && . venv/bin/activate && ruff check .

format:
	@echo "✨ Formatting backend..."
	cd backend && npm run format
	@echo "✨ Formatting frontend..."
	cd frontend && npm run format
	@echo "✨ Formatting chat-orchestrator..."
	cd chat-orchestrator && . venv/bin/activate && black .

# ======================
# Docker Commands
# ======================

docker-build:
	@echo "🐳 Building chat-orchestrator image..."
	docker build -t gitmesh/chat-orchestrator:latest ./chat-orchestrator

docker-up:
	@echo "🐳 Starting Docker Compose services..."
	docker-compose up -d

docker-down:
	@echo "🐳 Stopping Docker Compose services..."
	docker-compose down

# ======================
# Cleanup Commands
# ======================

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf frontend/dist
	rm -rf chat-orchestrator/__pycache__
	rm -rf chat-orchestrator/.pytest_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleanup complete"

# ======================
# Database Commands
# ======================

db-migrate:
	@echo "🗄️ Running database migrations..."
	cd backend && npm run sequelize-cli:source db:migrate

db-seed:
	@echo "🌱 Seeding database..."
	cd backend && npm run db:seed:dev
