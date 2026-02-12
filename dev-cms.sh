#!/bin/bash

# Local Decap CMS Development Script
# This script starts both the Decap CMS local backend and Hugo server for testing

echo "🚀 Starting local Decap CMS development environment..."
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Check if hugo is available
if ! command -v hugo &> /dev/null; then
    echo "❌ Error: Hugo is not installed. Please install Hugo first."
    echo "   Visit: https://gohugo.io/installation/"
    exit 1
fi

echo "✅ Prerequisites met"
echo ""
echo "Starting services..."
echo "  - Decap CMS backend: http://localhost:8081"
echo "  - Hugo dev server: http://localhost:1313"
echo "  - CMS admin interface: http://localhost:1313/admin/"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Trap Ctrl+C and kill both processes
trap 'echo ""; echo "Stopping services..."; kill $DECAP_PID $HUGO_PID 2>/dev/null; exit' INT TERM

# Start Decap CMS local backend in the background
npx decap-server &
DECAP_PID=$!
echo "✅ Decap CMS backend started (PID: $DECAP_PID)"

# Give the CMS backend a moment to start
sleep 2

# Start Hugo server in the background
hugo server -D &
HUGO_PID=$!
echo "✅ Hugo server started (PID: $HUGO_PID)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Ready! Open http://localhost:1313/admin/ to use Decap CMS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for both processes
wait $DECAP_PID $HUGO_PID
