const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../utils/config');

// Conditional imports based on mode
let ort;
if (config.MODE === 'server') {
  try {
    ort = require('onnxruntime-node');
  } catch (error) {
    logger.warn('ONNX Runtime not available for server mode, falling back to mock inference');
  }
}

class InferenceService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.isInitialized = false;
    this.sessionOptions = {};
    
    this.initialize();
  }

  /**
   * Initialize the inference service
   */
  async initialize() {
    try {
      await this.loadLabels();
      
      if (config.MODE === 'server' && ort) {
        await this.loadModel();
      }
      
      this.isInitialized = true;
      logger.info(`Inference service initialized in ${config.MODE} mode`);
    } catch (error) {
      logger.error('Failed to initialize inference service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Load COCO labels
   */
  async loadLabels() {
    try {
      const labelsPath = path.join(config.PATHS.models, 'labels.json');
      
      if (fs.existsSync(labelsPath)) {
        const labelsData = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
        this.labels = labelsData.labels || labelsData;
      } else {
        // Use default COCO labels from config
        this.labels = config.LABELS.coco?.classes || [
          'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train',
          'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign',
          'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep',
          'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
          'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
          'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
          'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork',
          'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
          'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
          'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv',
          'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave',
          'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
          'scissors', 'teddy bear', 'hair drier', 'toothbrush'
        ];
      }
      
      logger.info(`Loaded ${this.labels.length} class labels`);
    } catch (error) {
      logger.error('Failed to load labels:', error);
      throw error;
    }
  }

  /**
   * Load ONNX model for server mode
   */
  async loadModel() {
    try {
      const modelPath = path.join(config.PATHS.models, 'yolov5n.onnx');
      
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model file not found: ${modelPath}`);
      }

      // Configure session options
      this.sessionOptions = {
        executionProviders: ['CPUExecutionProvider'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true
      };

      // Create inference session
      this.model = await ort.InferenceSession.create(modelPath, this.sessionOptions);
      
      logger.info('ONNX model loaded successfully');
      logger.debug('Model inputs:', this.model.inputNames);
      logger.debug('Model outputs:', this.model.outputNames);
    } catch (error) {
      logger.error('Failed to load ONNX model:', error);
      throw error;
    }
  }

  /**
   * Detect objects in image
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<Array>} Array of detections
   */
  async detectObjects(imageData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (config.MODE === 'server' && this.model) {
        return await this.runServerInference(imageData);
      } else {
        // Return mock detections for WASM mode or when server model unavailable
        return this.generateMockDetections();
      }
    } catch (error) {
      logger.error('Object detection failed:', error);
      return [];
    }
  }

  /**
   * Run inference on server using ONNX Runtime
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<Array>} Array of detections
   */
  async runServerInference(imageData) {
    try {
      // Decode base64 image
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
      
      // Preprocess image
      const inputTensor = await this.preprocessImage(imageBuffer);
      
      // Run inference
      const feeds = {};
      feeds[this.model.inputNames[0]] = inputTensor;
      
      const results = await this.model.run(feeds);
      const output = results[this.model.outputNames[0]];
      
      // Post-process results
      const detections = this.postprocessResults(output);
      
      return detections;
    } catch (error) {
      logger.error('Server inference failed:', error);
      return this.generateMockDetections();
    }
  }

  /**
   * Preprocess image for ONNX model
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<ort.Tensor>} Preprocessed tensor
   */
  async preprocessImage(imageBuffer) {
    try {
      // For now, create a mock tensor
      // In a real implementation, you would:
      // 1. Decode image using sharp or canvas
      // 2. Resize to model input size (640x640 for YOLOv5)
      // 3. Normalize pixel values
      // 4. Convert to Float32Array
      // 5. Create ONNX tensor
      
      const inputSize = 640;
      const channels = 3;
      const inputData = new Float32Array(1 * channels * inputSize * inputSize);
      
      // Fill with normalized random values for demo
      for (let i = 0; i < inputData.length; i++) {
        inputData[i] = Math.random();
      }
      
      return new ort.Tensor('float32', inputData, [1, channels, inputSize, inputSize]);
    } catch (error) {
      logger.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  /**
   * Post-process ONNX model results
   * @param {ort.Tensor} output - Model output tensor
   * @returns {Array} Array of detections
   */
  postprocessResults(output) {
    try {
      const detections = [];
      
      // Mock post-processing for demo
      // In a real implementation, you would:
      // 1. Parse YOLO output format
      // 2. Apply confidence threshold
      // 3. Apply NMS (Non-Maximum Suppression)
      // 4. Convert to normalized coordinates
      
      const numDetections = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numDetections; i++) {
        const classId = Math.floor(Math.random() * this.labels.length);
        const score = 0.5 + Math.random() * 0.4; // Score between 0.5-0.9
        
        // Random bounding box coordinates (normalized)
        const xmin = Math.random() * 0.5;
        const ymin = Math.random() * 0.5;
        const width = 0.1 + Math.random() * 0.3;
        const height = 0.1 + Math.random() * 0.3;
        
        detections.push({
          label: this.labels[classId],
          score: score,
          bbox: [xmin, ymin, xmin + width, ymin + height]
        });
      }
      
      return detections;
    } catch (error) {
      logger.error('Post-processing failed:', error);
      return [];
    }
  }

  /**
   * Generate mock detections for demo purposes
   * @returns {Array} Array of mock detections
   */
  generateMockDetections() {
    const commonObjects = ['person', 'car', 'bicycle', 'dog', 'cat', 'chair', 'bottle'];
    const numDetections = Math.floor(Math.random() * 3) + 1;
    const detections = [];
    
    for (let i = 0; i < numDetections; i++) {
      const label = commonObjects[Math.floor(Math.random() * commonObjects.length)];
      const score = 0.6 + Math.random() * 0.3; // Score between 0.6-0.9
      
      // Random bounding box coordinates (normalized)
      const xmin = Math.random() * 0.6;
      const ymin = Math.random() * 0.6;
      const width = 0.15 + Math.random() * 0.25;
      const height = 0.15 + Math.random() * 0.25;
      
      detections.push({
        label: label,
        score: score,
        bbox: [xmin, ymin, Math.min(xmin + width, 1.0), Math.min(ymin + height, 1.0)]
      });
    }
    
    return detections;
  }

  /**
   * Get inference statistics
   * @returns {Object} Inference stats
   */
  getStats() {
    return {
      mode: config.MODE,
      isInitialized: this.isInitialized,
      labelsCount: this.labels.length,
      modelLoaded: !!this.model
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.model) {
        await this.model.release();
        this.model = null;
      }
      this.isInitialized = false;
      logger.info('Inference service cleaned up');
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }
}

module.exports = { InferenceService };
