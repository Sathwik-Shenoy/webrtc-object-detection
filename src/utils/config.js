const path = require('path');
const fs = require('fs');

// Environment variables with defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT) || 3000;
const MODE = process.env.MODE || 'wasm';

// Load environment-specific configuration
let envConfig = {};
try {
  const configPath = path.join(__dirname, '../../config', `${NODE_ENV}.json`);
  if (fs.existsSync(configPath)) {
    envConfig = require(configPath);
  }
} catch (error) {
  console.warn(`Failed to load ${NODE_ENV} config:`, error.message);
}

// Load model configuration
let modelConfig = {};
try {
  modelConfig = require('../../config/models.json');
} catch (error) {
  console.warn('Failed to load model config:', error.message);
}

// Merge configurations
const config = {
  NODE_ENV,
  PORT,
  MODE,
  
  // Server configuration
  SERVER: {
    host: envConfig.server?.host || '0.0.0.0',
    port: PORT
  },
  
  // Inference configuration
  INFERENCE: {
    mode: MODE,
    inputSize: envConfig.inference?.inputSize || { width: 320, height: 240 },
    targetFps: envConfig.inference?.targetFps || 15,
    maxQueueSize: envConfig.inference?.maxQueueSize || 5,
    scoreThreshold: envConfig.inference?.scoreThreshold || 0.5,
    nmsThreshold: envConfig.inference?.nmsThreshold || 0.4
  },
  
  // WebRTC configuration
  WEBRTC: {
    iceServers: envConfig.webrtc?.iceServers || [
      { urls: 'stun:stun.l.google.com:19302' }
    ],
    sdpSemantics: envConfig.webrtc?.sdpSemantics || 'unified-plan'
  },
  
  // Metrics configuration
  METRICS: {
    enabled: envConfig.metrics?.enabled !== false,
    windowSize: envConfig.metrics?.windowSize || 30,
    reportInterval: envConfig.metrics?.reportInterval || 1000
  },
  
  // Logging configuration
  LOGGING: {
    level: envConfig.logging?.level || (NODE_ENV === 'production' ? 'warn' : 'info'),
    format: envConfig.logging?.format || 'combined'
  },
  
  // Model configuration
  MODELS: modelConfig.models || {},
  LABELS: modelConfig.labels || {},
  
  // Paths
  PATHS: {
    models: path.join(__dirname, '../../public/models'),
    static: path.join(__dirname, '../../public'),
    logs: path.join(__dirname, '../../logs'),
    results: path.join(__dirname, '../../bench/results')
  }
};

// Validation
if (!['wasm', 'server'].includes(config.MODE)) {
  throw new Error(`Invalid MODE: ${config.MODE}. Must be 'wasm' or 'server'`);
}

module.exports = config;
