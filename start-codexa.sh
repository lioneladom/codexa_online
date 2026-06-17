#!/bin/bash

# Exit immediately if a command fails
set -e

echo "============================================="
echo "       STARTING CODEXA EXAM NETWORK SERVER   "
echo "============================================="

# Get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm/Node.js is not installed on this system."
    echo "Please install Node.js to run Codexa."
    read -p "Press Enter to exit..."
    exit 1
fi

# 1. Install dependencies if not present
if [ ! -d "$DIR/backend/node_modules" ]; then
    echo "Installing backend dependencies (first time setup)..."
    cd "$DIR/backend" && npm install
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
    echo "Installing frontend dependencies (first time setup)..."
    cd "$DIR/frontend" && npm install
fi

# 2. Setup local offline SQLite database
echo "Initializing local database..."
cd "$DIR/backend"
npm run db:local

# 3. Build projects if builds don't exist
if [ ! -d "$DIR/backend/dist" ]; then
    echo "Building backend..."
    npm run build
fi

if [ ! -d "$DIR/frontend/.next" ]; then
    echo "Building frontend..."
    cd "$DIR/frontend" && npm run build
fi

# 4. Start servers in background
echo "Starting Codexa Backend..."
cd "$DIR/backend"
npm run start:prod > /dev/null 2>&1 &
BACKEND_PID=$!

echo "Starting Codexa Frontend..."
cd "$DIR/frontend"
npm run start:lan > /dev/null 2>&1 &
FRONTEND_PID=$!

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Shutting down Codexa servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Servers stopped. Goodbye!"
    exit 0
}

# Trap exit signals to run cleanup
trap cleanup SIGINT SIGTERM EXIT

# 5. Wait for servers to spin up
echo "Waiting for servers to start..."
sleep 4

# 6. Get local IP address to show the lecturer
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "============================================="
echo "Codexa is now running!"
echo "Lecturer Dashboard: http://localhost:3000"
echo "Student Entrance (LAN): http://$LOCAL_IP:3000/exam/[code]"
echo "============================================="
echo "Opening Lecturer Dashboard in browser..."

# Open default browser
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &>/dev/null &
fi

echo "Keep this window open during the exam."
echo "Press Ctrl+C in this terminal to stop the servers."

# Keep script running to maintain processes
while true; do
    sleep 1
done
