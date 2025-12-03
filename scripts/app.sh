#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/server/.pid"
LOG_FILE="$PROJECT_ROOT/server/app.log"

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Application is already running (PID: $PID)"
            exit 1
        else
            rm -f "$PID_FILE"
        fi
    fi

    echo "Starting Brew Journal server..."
    cd "$PROJECT_ROOT/server"
    
    # Check if built
    if [ ! -d "dist" ]; then
        echo "Server not built. Please run ./scripts/deploy.sh first."
        exit 1
    fi
    
    # Start the server in background (nohup + disown ensures it survives terminal close)
    nohup node dist/index.js > "$LOG_FILE" 2>&1 &
    PID=$!
    disown $PID
    echo $PID > "$PID_FILE"
    
    sleep 2
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Application started successfully (PID: $PID)"
        echo "Server running at http://localhost:3003"
        echo "Logs: $LOG_FILE"
    else
        echo "Failed to start application. Check logs at $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Application is not running (no PID file found)"
        exit 0
    fi

    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Stopping application (PID: $PID)..."
        kill "$PID"
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Force stopping..."
            kill -9 "$PID"
        fi
        
        echo "Application stopped"
    else
        echo "Application was not running"
    fi
    
    rm -f "$PID_FILE"
}

restart() {
    echo "Restarting application..."
    stop
    sleep 1
    start
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Application is running (PID: $PID)"
            echo "Server: http://localhost:3003"
        else
            echo "Application is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Application is not running"
    fi
}

logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "No log file found at $LOG_FILE"
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the application"
        echo "  stop    - Stop the application"
        echo "  restart - Restart the application"
        echo "  status  - Check if application is running"
        echo "  logs    - Tail the application logs"
        exit 1
        ;;
esac
