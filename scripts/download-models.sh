#!/bin/bash

# Model Download Script for WebRTC Object Detection
# Downloads ONNX models for inference

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MODELS_DIR="$PROJECT_ROOT/public/models"

echo "📥 Downloading ML models for WebRTC Object Detection"
echo "Models directory: $MODELS_DIR"

# Create models directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Download YOLOv5n ONNX model
YOLO_MODEL_URL="https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5n.onnx"
YOLO_MODEL_PATH="$MODELS_DIR/yolov5n.onnx"

if [ ! -f "$YOLO_MODEL_PATH" ]; then
    echo "⬇️  Downloading YOLOv5n model..."
    
    if command -v curl &> /dev/null; then
        curl -L -o "$YOLO_MODEL_PATH" "$YOLO_MODEL_URL"
    elif command -v wget &> /dev/null; then
        wget -O "$YOLO_MODEL_PATH" "$YOLO_MODEL_URL"
    else
        echo "❌ Error: Neither curl nor wget is available"
        echo "Please install curl or wget, or download manually:"
        echo "  URL: $YOLO_MODEL_URL"
        echo "  Save to: $YOLO_MODEL_PATH"
        exit 1
    fi
    
    if [ -f "$YOLO_MODEL_PATH" ]; then
        echo "✅ YOLOv5n model downloaded successfully"
        echo "   Size: $(du -h "$YOLO_MODEL_PATH" | cut -f1)"
    else
        echo "❌ Failed to download YOLOv5n model"
        exit 1
    fi
else
    echo "✅ YOLOv5n model already exists"
fi

# Verify model file
if [ -f "$YOLO_MODEL_PATH" ]; then
    file_size=$(stat -f%z "$YOLO_MODEL_PATH" 2>/dev/null || stat -c%s "$YOLO_MODEL_PATH" 2>/dev/null || echo "0")
    
    # YOLOv5n should be around 14MB
    if [ "$file_size" -lt 10000000 ]; then
        echo "⚠️  Warning: Model file seems too small ($file_size bytes)"
        echo "   Expected size: ~14MB (14,000,000 bytes)"
        echo "   You may need to re-download the model"
    else
        echo "✅ Model file size looks correct ($file_size bytes)"
    fi
fi

# Download additional models if needed
echo ""
echo "📋 Available models:"
echo "  ✅ YOLOv5n (Nano) - Fast, low accuracy"

if [ "$1" = "--all" ]; then
    echo "⬇️  Downloading additional models..."
    
    # YOLOv5s (Small)
    YOLO5S_URL="https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5s.onnx"
    YOLO5S_PATH="$MODELS_DIR/yolov5s.onnx"
    
    if [ ! -f "$YOLO5S_PATH" ]; then
        echo "⬇️  Downloading YOLOv5s model..."
        if command -v curl &> /dev/null; then
            curl -L -o "$YOLO5S_PATH" "$YOLO5S_URL"
        else
            wget -O "$YOLO5S_PATH" "$YOLO5S_URL"
        fi
        echo "✅ YOLOv5s model downloaded"
    fi
fi

echo ""
echo "🎯 Model download complete!"
echo ""
echo "Available models in $MODELS_DIR:"
for model in "$MODELS_DIR"/*.onnx; do
    if [ -f "$model" ]; then
        echo "  - $(basename "$model") ($(du -h "$model" | cut -f1))"
    fi
done

echo ""
echo "📝 Configuration files:"
echo "  - Labels: $MODELS_DIR/labels.json"
echo "  - Config: $MODELS_DIR/model-config.json"

# Verify all required files exist
required_files=(
    "$MODELS_DIR/labels.json"
    "$MODELS_DIR/model-config.json"
    "$YOLO_MODEL_PATH"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo ""
    echo "✅ All required model files are present"
    echo "🚀 Ready to start object detection!"
else
    echo ""
    echo "❌ Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi
