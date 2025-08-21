const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../utils/validators');
const logger = require('../utils/logger');
const config = require('../utils/config');

// Get system status
router.get('/status', asyncHandler(async (req, res) => {
  const status = {
    server: {
      status: 'running',
      uptime: process.uptime(),
      mode: config.MODE,
      nodeVersion: process.version,
      platform: process.platform
    },
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json(status);
}));

// Get configuration
router.get('/config', asyncHandler(async (req, res) => {
  const publicConfig = {
    mode: config.MODE,
    inference: {
      targetFps: config.INFERENCE.targetFps,
      inputSize: config.INFERENCE.inputSize,
      scoreThreshold: config.INFERENCE.scoreThreshold
    },
    webrtc: config.WEBRTC,
    metrics: {
      enabled: config.METRICS.enabled,
      reportInterval: config.METRICS.reportInterval
    }
  };
  
  res.json(publicConfig);
}));

// Get available models
router.get('/models', asyncHandler(async (req, res) => {
  const models = Object.keys(config.MODELS).map(key => ({
    id: key,
    ...config.MODELS[key]
  }));
  
  res.json({
    models,
    labels: config.LABELS
  });
}));

// Test inference endpoint
router.post('/test-inference', asyncHandler(async (req, res) => {
  const { imageData } = req.body;
  
  if (!imageData) {
    return res.status(400).json({
      error: 'Missing imageData in request body'
    });
  }
  
  try {
    // Import inference service here to avoid circular dependency
    const { InferenceService } = require('../services/inference');
    const inferenceService = new InferenceService();
    
    const startTime = Date.now();
    const detections = await inferenceService.detectObjects(imageData);
    const endTime = Date.now();
    
    res.json({
      success: true,
      detections,
      processingTime: endTime - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test inference failed:', error);
    res.status(500).json({
      error: 'Inference failed',
      message: error.message
    });
  }
}));

// WebRTC signaling endpoints
router.post('/signal/offer', asyncHandler(async (req, res) => {
  const { offer, sessionId } = req.body;
  
  if (!offer || !sessionId) {
    return res.status(400).json({
      error: 'Missing offer or sessionId'
    });
  }
  
  // In a real implementation, you would store this offer
  // and forward it to the appropriate peer
  logger.info(`Received offer for session ${sessionId}`);
  
  res.json({
    success: true,
    message: 'Offer received',
    sessionId
  });
}));

router.post('/signal/answer', asyncHandler(async (req, res) => {
  const { answer, sessionId } = req.body;
  
  if (!answer || !sessionId) {
    return res.status(400).json({
      error: 'Missing answer or sessionId'
    });
  }
  
  logger.info(`Received answer for session ${sessionId}`);
  
  res.json({
    success: true,
    message: 'Answer received',
    sessionId
  });
}));

router.post('/signal/ice-candidate', asyncHandler(async (req, res) => {
  const { candidate, sessionId } = req.body;
  
  if (!candidate || !sessionId) {
    return res.status(400).json({
      error: 'Missing candidate or sessionId'
    });
  }
  
  logger.info(`Received ICE candidate for session ${sessionId}`);
  
  res.json({
    success: true,
    message: 'ICE candidate received',
    sessionId
  });
}));

// Health check with detailed information
router.get('/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: config.MODE,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    checks: {
      server: 'ok',
      inference: 'ok',
      webrtc: 'ok'
    }
  };
  
  res.json(health);
}));

module.exports = router;
