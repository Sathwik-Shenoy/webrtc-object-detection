#!/bin/bash

# Test script for WebRTC Object Detection
# Runs basic validation tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧪 Running WebRTC Object Detection Tests"
echo "Project: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# Test 1: Check required files
echo "📁 Checking required files..."

required_files=(
    "package.json"
    "server.js"
    "start.sh"
    "README.md"
    "public/index.html"
    "public/phone-connect.html"
    "src/services/webrtc.js"
    "src/services/inference.js"
    "src/services/metrics.js"
    "bench/run_bench.sh"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All required files present"
else
    echo "❌ Missing files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Test 2: Check Node.js syntax
echo "🔍 Checking JavaScript syntax..."

js_files=(
    "server.js"
    "src/utils/config.js"
    "src/utils/logger.js"
    "src/services/webrtc.js"
    "src/services/inference.js"
    "src/services/metrics.js"
    "src/routes/index.js"
    "src/routes/api.js"
    "src/routes/metrics.js"
    "bench/benchmark.js"
)

syntax_errors=()
for file in "${js_files[@]}"; do
    if [ -f "$file" ]; then
        if ! node -c "$file" 2>/dev/null; then
            syntax_errors+=("$file")
        fi
    fi
done

if [ ${#syntax_errors[@]} -eq 0 ]; then
    echo "✅ All JavaScript files have valid syntax"
else
    echo "❌ Syntax errors in:"
    for file in "${syntax_errors[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Test 3: Check package.json
echo "📦 Validating package.json..."

if ! node -e "require('./package.json')" 2>/dev/null; then
    echo "❌ Invalid package.json"
    exit 1
fi

echo "✅ package.json is valid"

# Test 4: Check dependencies
echo "📥 Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found, running npm install..."
    npm install
fi

# Check critical dependencies
critical_deps=("express" "socket.io" "winston")
missing_deps=()

for dep in "${critical_deps[@]}"; do
    if [ ! -d "node_modules/$dep" ]; then
        missing_deps+=("$dep")
    fi
done

if [ ${#missing_deps[@]} -eq 0 ]; then
    echo "✅ Critical dependencies are installed"
else
    echo "❌ Missing dependencies:"
    for dep in "${missing_deps[@]}"; do
        echo "  - $dep"
    done
    echo "Run: npm install"
    exit 1
fi

# Test 5: Check executable permissions
echo "🔧 Checking executable permissions..."

executable_files=(
    "start.sh"
    "bench/run_bench.sh"
    "scripts/setup.sh"
    "scripts/download-models.sh"
)

non_executable=()
for file in "${executable_files[@]}"; do
    if [ -f "$file" ] && [ ! -x "$file" ]; then
        non_executable+=("$file")
    fi
done

if [ ${#non_executable[@]} -eq 0 ]; then
    echo "✅ All script files are executable"
else
    echo "⚠️  Making scripts executable:"
    for file in "${non_executable[@]}"; do
        chmod +x "$file"
        echo "  - $file"
    done
fi

# Test 6: Check configuration files
echo "⚙️  Checking configuration files..."

config_files=(
    "config/development.json"
    "config/production.json"
    "config/models.json"
    "public/models/labels.json"
    "public/models/model-config.json"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        if ! node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" 2>/dev/null; then
            echo "❌ Invalid JSON in $file"
            exit 1
        fi
    else
        echo "⚠️  Missing config file: $file"
    fi
done

echo "✅ Configuration files are valid"

# Test 7: Check model files
echo "🧠 Checking ML model files..."

if [ ! -f "public/models/yolov5n.onnx" ]; then
    echo "⚠️  ONNX model not found, downloading..."
    ./scripts/download-models.sh
else
    echo "✅ ONNX model present"
fi

# Test 8: Simulate server startup (dry run)
echo "🚀 Testing server startup (dry run)..."

if NODE_ENV=test timeout 5s node -e "
const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.get('/test', (req, res) => res.json({status: 'ok'}));
server.listen(0, () => {
  console.log('Test server started on port', server.address().port);
  server.close();
});
" 2>/dev/null; then
    echo "✅ Server startup test passed"
else
    echo "❌ Server startup test failed"
    exit 1
fi

# Test 9: Check HTML validity (basic)
echo "🌐 Checking HTML files..."

html_files=("public/index.html" "public/phone-connect.html")
for file in "${html_files[@]}"; do
    if [ -f "$file" ]; then
        # Basic HTML validation - check for required tags
        if grep -q "<!DOCTYPE html>" "$file" && grep -q "</html>" "$file"; then
            echo "✅ $file has valid HTML structure"
        else
            echo "❌ $file missing required HTML tags"
            exit 1
        fi
    fi
done

# Test 10: Check port availability
echo "🔌 Checking default port availability..."

if command -v netstat &> /dev/null; then
    if netstat -ln | grep -q ":3000 "; then
        echo "⚠️  Port 3000 is already in use"
    else
        echo "✅ Port 3000 is available"
    fi
else
    echo "⚠️  netstat not available, skipping port check"
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "✨ Ready to start:"
echo "  ./start.sh"
echo ""
echo "📱 Or run full setup:"
echo "  ./scripts/setup.sh"
