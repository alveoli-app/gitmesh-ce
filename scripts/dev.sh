#!/bin/bash
# DevSpace Development Environment Startup Script
# Starts all services needed for Chat Tab development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        log_error "Python is not installed. Please install Python 3.11+."
        exit 1
    fi
    
    # Check pip
    if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
        log_error "pip is not installed. Please install pip."
        exit 1
    fi
    
    log_success "All prerequisites met."
}

# Check premium directories for EE build
check_premium_directories() {
    log_info "Checking premium directories..."
    
    if node "$SCRIPT_DIR/check-premium-dirs.js" > /dev/null 2>&1; then
        log_success "Premium directories found - Enterprise Edition available."
        return 0
    else
        log_warning "Premium directories not found or incomplete."
        return 1
    fi
}

# Setup chat-orchestrator Python environment
setup_python_env() {
    log_info "Setting up Python environment for chat-orchestrator..."
    
    CHAT_DIR="$PROJECT_ROOT/chat-orchestrator"
    
    if [ ! -d "$CHAT_DIR" ]; then
        log_error "chat-orchestrator directory not found at $CHAT_DIR"
        exit 1
    fi
    
    cd "$CHAT_DIR"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv || python -m venv venv
    fi
    
    # Activate and install dependencies
    source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null
    
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt --quiet
    
    log_success "Python environment ready."
}

# Check for .env file
check_env_file() {
    CHAT_DIR="$PROJECT_ROOT/chat-orchestrator"
    
    if [ ! -f "$CHAT_DIR/.env" ]; then
        log_warning ".env file not found in chat-orchestrator."
        log_info "Creating .env from .env.example..."
        
        if [ -f "$CHAT_DIR/.env.example" ]; then
            cp "$CHAT_DIR/.env.example" "$CHAT_DIR/.env"
            log_warning "Please edit $CHAT_DIR/.env and add your OPENAI_API_KEY."
        fi
    fi
}

# Configure frontend environment variables
configure_frontend_env() {
    log_info "Configuring frontend environment..."
    ENV_FILE="$PROJECT_ROOT/frontend/.env.override.local"
    
    # Touch file if not exists
    touch "$ENV_FILE"
    
    # Define value
    local vue_app_edition="gitmesh-ee"
    local vue_app_tenant_mode="multi"
    
    if [ "$EDITION" == "ce" ]; then
        vue_app_edition="gitmesh-ce"
        vue_app_tenant_mode="single"
    fi
    
    # Check if VUE_APP_EDITION exists in file
    if grep -q "VUE_APP_EDITION=" "$ENV_FILE"; then
        sed -i "s/VUE_APP_EDITION=.*/VUE_APP_EDITION=$vue_app_edition/" "$ENV_FILE"
    else
        echo "VUE_APP_EDITION=$vue_app_edition" >> "$ENV_FILE"
    fi
    
    # Check if VUE_APP_TENANT_MODE exists in file
    if grep -q "VUE_APP_TENANT_MODE=" "$ENV_FILE"; then
        sed -i "s/VUE_APP_TENANT_MODE=.*/VUE_APP_TENANT_MODE=$vue_app_tenant_mode/" "$ENV_FILE"
    else
        echo "VUE_APP_TENANT_MODE=$vue_app_tenant_mode" >> "$ENV_FILE"
    fi
}

# Start all services
start_services() {
    log_info "Starting DevSpace services..."
    
    configure_frontend_env

    # Start backend in background
    log_info "Starting Node.js backend..."
    cd "$PROJECT_ROOT/backend"
    npm run start:api:dev:local &
    BACKEND_PID=$!
    
    # Start chat-orchestrator in background
    log_info "Starting chat-orchestrator..."
    cd "$PROJECT_ROOT/chat-orchestrator"
    source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
    CHAT_PID=$!
    
    # Start frontend in background
    log_info "Starting frontend..."
    cd "$PROJECT_ROOT/frontend"
    npm run start:dev:local &
    FRONTEND_PID=$!
    
    log_success "All services started!"
    echo ""
    echo "======================================"
    echo "  DevSpace Development Environment"
    echo "======================================"
    echo ""
    echo "  🌐 Frontend:          http://localhost:8081"
    echo "  🔧 Backend API:       http://localhost:8080"
    echo "  🤖 Chat Orchestrator: http://localhost:8001"
    echo ""
    echo "  Press Ctrl+C to stop all services"
    echo "======================================"
    echo ""
    
    # Wait for any process to exit
    wait
}

# Cleanup on exit
cleanup() {
    log_info "Shutting down services..."
    
    # Kill all background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$CHAT_PID" ]; then
        kill $CHAT_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    log_success "Services stopped."
    exit 0
}

# Main
main() {
    trap cleanup SIGINT SIGTERM
    
    echo ""
    echo "=========================================="
    echo "  DevSpace Development Environment Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    setup_python_env
    check_env_file
    start_services
}

# Parse arguments
EDITION=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --setup-only)
            check_prerequisites
            setup_python_env
            check_env_file
            log_success "Setup complete. Run './scripts/dev.sh' to start services."
            exit 0
            ;;
        --help)
            echo "Usage: ./scripts/dev.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --ce            Start in Community Edition mode"
            echo "  --ee            Start in Enterprise Edition mode"
            echo "  --setup-only    Only setup dependencies, don't start services"
            echo "  --help          Show this help message"
            echo ""
            echo "Environment:"
            echo "  OPENAI_API_KEY  Required for chat-orchestrator"
            exit 0
            ;;
        --ce)
            EDITION="ce"
            shift
            ;;
        --ee)
            EDITION="ee"
            shift
            ;;
        *)
            log_error "Unknown parameter passed: $1"
            exit 1
            ;;
    esac
done

# Default to EE if not specified
if [ -z "$EDITION" ]; then
    EDITION="ee"
    log_info "No edition specified, defaulting to Enterprise Edition (EE)"
fi

# Set Environment Variables based on Edition
if [ "$EDITION" == "ce" ]; then
    export TENANT_MODE="single"
    export EDITION="ce"
    log_info "Starting in Community Edition (CE) mode..."
else
    export TENANT_MODE="multi"
    export EDITION="ee"
    log_info "Starting in Enterprise Edition (EE) mode..."
fi

# Check Critical Environment Variables
check_critical_vars() {
    log_info "Checking environment variables..."
    local missing_vars=()

    # Chat Orchestrator
    if [ ! -f "$PROJECT_ROOT/chat-orchestrator/.env" ]; then
        # If no .env, check process env
        if [ -z "$OPENAI_API_KEY" ]; then
            missing_vars+=("OPENAI_API_KEY (chat-orchestrator)")
        fi
    else
        # minimal check if .env exists, we assume user filled it or script copied it
        # but let's grep for placeholder
        if grep -q "sk-your-api-key-here" "$PROJECT_ROOT/chat-orchestrator/.env"; then
             log_warning "OPENAI_API_KEY is still default in chat-orchestrator/.env"
        fi
    fi

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_warning "Please ensure these are set in .env files or your shell."
        # We don't exit here, just warn, as defaults might exist
    else
        log_success "Environment check passed."
    fi
}

# Main execution
main() {
    trap cleanup SIGINT SIGTERM
    
    echo ""
    echo "=========================================="
    echo "  DevSpace Development Environment Setup"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    
    # Check premium directories if EE edition is requested
    if [ "$EDITION" == "ee" ]; then
        if ! check_premium_directories; then
            log_warning "Premium directories not available, falling back to Community Edition"
            EDITION="ce"
        fi
    fi
    
    setup_python_env
    check_env_file
    check_critical_vars
    start_services
}

main
