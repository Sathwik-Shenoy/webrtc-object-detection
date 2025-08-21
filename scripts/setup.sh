#!/bin/bash

# Setup script for WebRTC Object Detection
# Installs dependencies and prepares the environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up WebRTC Object Detection Demo"
echo "Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# Check system requirements
echo "🔍 Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old"
    echo "Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $NODE_VERSION found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

echo "✅ npm $(npm --version) found"

# Optional: Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) found"
else
    echo "⚠️  Docker not found (optional, but recommended)"
fi

# Optional: Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python3 $(python3 --version | cut -d' ' -f2) found"
else
    echo "⚠️  Python3 not found (optional, for scripts)"
fi

echo ""

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

npm install

echo "✅ Dependencies installed"

# Create necessary directories
echo "📁 Creating directories..."

directories=(
    "logs"
    "bench/results"
    "public/models"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
    echo "  ✅ Created $dir/"
done

# Download models
echo "📥 Downloading ML models..."
./scripts/download-models.sh

# Make scripts executable
echo "🔧 Setting up executable scripts..."

scripts=(
    "start.sh"
    "bench/run_bench.sh"
    "scripts/download-models.sh"
    "scripts/test.sh"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo "  ✅ Made $script executable"
    fi
done

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating environment file..."
    cat > .env << EOF
# WebRTC Object Detection Environment Configuration
NODE_ENV=development
PORT=3000
MODE=wasm

# Logging
LOG_LEVEL=info

# Inference settings
TARGET_FPS=15
INPUT_WIDTH=320
INPUT_HEIGHT=240
SCORE_THRESHOLD=0.5
NMS_THRESHOLD=0.4

# WebRTC settings
ICE_SERVERS=stun:stun.l.google.com:19302
EOF
    echo "✅ Created .env file"
fi

# Run basic tests
echo "🧪 Running basic tests..."

# Test Node.js syntax
if node -c server.js; then
    echo "✅ Server.js syntax is valid"
else
    echo "❌ Server.js has syntax errors"
    exit 1
fi

# Test package.json
if npm run --silent test --dry-run 2>/dev/null; then
    echo "✅ Package.json test script is valid"
else
    echo "⚠️  No test script defined (this is OK)"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "🚀 Quick start:"
echo "  1. Start the server:"
echo "     ./start.sh"
echo ""
echo "  2. Open http://localhost:3000 in your browser"
echo ""
echo "  3. Scan QR code with your phone or visit:"
echo "     http://localhost:3000/phone-connect.html"
echo ""
echo "  4. Run benchmark:"
echo "     ./bench/run_bench.sh --duration 30 --mode wasm"
echo ""
echo "📖 For more information, see README.md"

# Display system info
echo ""
echo "💻 System Information:"
echo "  OS: $(uname -s) $(uname -r)"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Project: $(pwd)"

if command -v docker &> /dev/null; then
    echo "  Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
fi

if command -v python3 &> /dev/null; then
    echo "  Python: $(python3 --version | cut -d' ' -f2)"
fi

echo ""
echo "✨ Ready to detect objects in real-time!"
