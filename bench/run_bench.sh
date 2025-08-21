#!/bin/bash

# WebRTC Object Detection Benchmarking Script
# Usage: ./run_bench.sh [--duration 30] [--mode server|wasm] [--output metrics.json]

set -e

# Default values
DURATION=30
MODE=${MODE:-wasm}
OUTPUT_FILE="metrics.json"
SERVER_URL="http://localhost:3000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --server-url)
      SERVER_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--duration 30] [--mode server|wasm] [--output metrics.json] [--server-url http://localhost:3000]"
      echo ""
      echo "Options:"
      echo "  --duration     Benchmark duration in seconds (default: 30)"
      echo "  --mode         Inference mode: 'server' or 'wasm' (default: wasm)"
      echo "  --output       Output metrics file (default: metrics.json)"
      echo "  --server-url   Server URL (default: http://localhost:3000)"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo "🚀 Starting WebRTC Object Detection Benchmark"
echo "Duration: ${DURATION}s"
echo "Mode: ${MODE}"
echo "Output: ${OUTPUT_FILE}"
echo "Server: ${SERVER_URL}"
echo ""

# Check if server is running
echo "📡 Checking server status..."
if ! curl -s "${SERVER_URL}/health" > /dev/null; then
  echo "❌ Server not accessible at ${SERVER_URL}"
  echo "Please start the server first:"
  echo "  ./start.sh --mode ${MODE}"
  exit 1
fi

echo "✅ Server is running"

# Create results directory
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "$RESULTS_DIR"

# Set output path
if [[ "$OUTPUT_FILE" != /* ]]; then
  OUTPUT_PATH="${RESULTS_DIR}/${OUTPUT_FILE}"
else
  OUTPUT_PATH="$OUTPUT_FILE"
fi

# Reset metrics
echo "🔄 Resetting metrics..."
curl -s -X POST "${SERVER_URL}/metrics/reset" > /dev/null

# Start metrics collection
echo "📊 Starting metrics collection..."
curl -s -X POST "${SERVER_URL}/metrics/start" > /dev/null

echo "⏱️  Running benchmark for ${DURATION} seconds..."
echo "Please ensure a phone is connected and streaming during this time."
echo ""

# Run the benchmark
if command -v node &> /dev/null; then
  # Use Node.js benchmark script if available
  node "${SCRIPT_DIR}/benchmark.js" --duration "$DURATION" --mode "$MODE" --server-url "$SERVER_URL"
else
  # Simple sleep-based benchmark
  echo "📱 Benchmark running... (ensure phone is streaming)"
  
  for i in $(seq 1 $DURATION); do
    sleep 1
    echo -ne "\rProgress: $i/${DURATION}s"
  done
  echo ""
fi

# Stop metrics collection
echo "🛑 Stopping metrics collection..."
curl -s -X POST "${SERVER_URL}/metrics/stop" > /dev/null

# Generate and save report
echo "📋 Generating metrics report..."
REPORT_RESPONSE=$(curl -s -X POST "${SERVER_URL}/metrics/save" \
  -H "Content-Type: application/json" \
  -d "{\"duration\": $DURATION, \"filename\": \"$(basename "$OUTPUT_PATH")\"}")

if echo "$REPORT_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Metrics saved successfully"
  
  # Copy to desired location if different from server location
  SERVER_METRICS_PATH="${PROJECT_ROOT}/bench/results/$(basename "$OUTPUT_PATH")"
  if [ "$OUTPUT_PATH" != "$SERVER_METRICS_PATH" ] && [ -f "$SERVER_METRICS_PATH" ]; then
    cp "$SERVER_METRICS_PATH" "$OUTPUT_PATH"
  fi
  
  # Display summary
  echo ""
  echo "📊 Benchmark Summary"
  echo "===================="
  
  if command -v python3 &> /dev/null && [ -f "$OUTPUT_PATH" ]; then
    python3 -c "
import json
import sys

try:
    with open('$OUTPUT_PATH', 'r') as f:
        data = json.load(f)
    
    print(f\"Duration: {data.get('duration', 0):.1f}s\")
    print(f\"Mode: {data.get('mode', 'unknown')}\")
    print(f\"Total Frames: {data.get('frames', {}).get('total', 0)}\")
    print(f\"Processed Frames: {data.get('frames', {}).get('processed', 0)}\")
    print(f\"Average FPS: {data.get('fps', {}).get('processed', 0):.1f}\")
    
    latency = data.get('latency', {}).get('e2e', {})
    print(f\"E2E Latency - Median: {latency.get('median', 0):.0f}ms\")
    print(f\"E2E Latency - P95: {latency.get('p95', 0):.0f}ms\")
    
    bandwidth = data.get('bandwidth', {})
    print(f\"Uplink: {bandwidth.get('uplink_kbps', 0)} kbps\")
    print(f\"Downlink: {bandwidth.get('downlink_kbps', 0)} kbps\")
    
    detections = data.get('detections', {})
    print(f\"Total Detections: {detections.get('total', 0)}\")
    print(f\"Avg Detections/Frame: {detections.get('average', 0):.1f}\")
    
except Exception as e:
    print(f\"Error reading metrics: {e}\", file=sys.stderr)
"
  else
    echo "Metrics file: $OUTPUT_PATH"
    echo "Use 'cat $OUTPUT_PATH | jq' for detailed view"
  fi
  
  echo ""
  echo "📁 Files generated:"
  echo "  - Metrics: $OUTPUT_PATH"
  
  # Copy to project root for convenience
  ROOT_METRICS="${PROJECT_ROOT}/metrics.json"
  cp "$OUTPUT_PATH" "$ROOT_METRICS"
  echo "  - Root copy: $ROOT_METRICS"
  
else
  echo "❌ Failed to save metrics"
  echo "Response: $REPORT_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 Benchmark completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Review metrics in $OUTPUT_PATH"
echo "  2. Record a Loom video showing the demo"
echo "  3. Document performance observations"
