#!/bin/bash

# WebRTC Object Detection Demo Start Script
# Usage: ./start.sh [--mode server|wasm] [--ngrok] [--port 3000]

set -e

# Default values
MODE="wasm"
USE_NGROK=false
PORT=3000
NGROK_TOKEN=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --ngrok)
      USE_NGROK=true
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --ngrok-token)
      NGROK_TOKEN="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--mode server|wasm] [--ngrok] [--port 3000] [--ngrok-token TOKEN]"
      echo ""
      echo "Options:"
      echo "  --mode         Inference mode: 'server' (GPU/CPU inference) or 'wasm' (browser-side)"
      echo "  --ngrok        Start ngrok tunnel for phone connectivity"
      echo "  --port         Server port (default: 3000)"
      echo "  --ngrok-token  Ngrok auth token (optional)"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo "🚀 Starting WebRTC Object Detection Demo"
echo "Mode: $MODE"
echo "Port: $PORT"

# Set environment variables
export MODE=$MODE
export PORT=$PORT
export NODE_ENV=${NODE_ENV:-development}

# Check if Docker is available and preferred
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
  echo "📦 Using Docker Compose..."
  
  # Build and start with docker-compose
  docker-compose down --remove-orphans
  MODE=$MODE PORT=$PORT docker-compose up --build
  
elif command -v docker &> /dev/null && [ -f "Dockerfile" ]; then
  echo "🐳 Using Docker..."
  
  # Build and run with Docker
  docker build -t webrtc-object-detection .
  docker run -p $PORT:$PORT -e MODE=$MODE -e PORT=$PORT webrtc-object-detection
  
else
  echo "📦 Using Node.js directly..."
  
  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  # Download models if they don't exist
  if [ ! -f "public/models/yolov5n.onnx" ]; then
    echo "📥 Downloading ML models..."
    ./scripts/download-models.sh
  fi
  
  # Start the server
  if [ "$USE_NGROK" = true ]; then
    echo "🌐 Starting with ngrok tunnel..."
    
    # Check if ngrok is installed
    if ! command -v ngrok &> /dev/null; then
      echo "❌ ngrok not found. Please install ngrok: https://ngrok.com/download"
      exit 1
    fi
    
    # Start ngrok in background
    if [ -n "$NGROK_TOKEN" ]; then
      ngrok config add-authtoken $NGROK_TOKEN
    fi
    
    ngrok http $PORT --log=stdout > ngrok.log 2>&1 &
    NGROK_PID=$!
    
    # Wait for ngrok to start
    sleep 3
    
    # Get public URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null || echo "")
    
    if [ -n "$NGROK_URL" ]; then
      echo "🌐 Public URL: $NGROK_URL"
  echo "📱 Use this URL on your phone: $NGROK_URL/phone-connect.html"
    fi
    
    # Cleanup function
    cleanup() {
      echo "🧹 Cleaning up..."
      kill $NGROK_PID 2>/dev/null || true
      rm -f ngrok.log
    }
    trap cleanup EXIT
  fi
  
  echo "🌍 Server will be available at:"
  echo "  Local:   http://localhost:$PORT"
  echo "  Phone:   http://localhost:$PORT/phone-connect.html"
  
  if [ "$USE_NGROK" = true ] && [ -n "$NGROK_URL" ]; then
    echo "  Public:  $NGROK_URL"
  fi
  
  echo ""
  echo "📱 Instructions:"
  echo "  1. Open http://localhost:$PORT on your laptop"
  echo "  2. Scan the QR code with your phone camera"
  echo "  3. Allow camera permissions"
  echo "  4. Start streaming!"
  echo ""
  
  # Start the Node.js server
  npm start
fi
