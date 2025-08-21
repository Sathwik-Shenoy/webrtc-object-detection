const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { MetricsService } = require('../services/metrics');
const logger = require('../utils/logger');

// Global metrics service instance
let metricsService = null;

// Initialize metrics service
function getMetricsService() {
  if (!metricsService) {
    metricsService = new MetricsService();
  }
  return metricsService;
}

// Get current metrics
router.get('/', asyncHandler(async (req, res) => {
  const service = getMetricsService();
  const metrics = service.getCurrentMetrics();
  
  res.json(metrics);
}));

// Get metrics summary
router.get('/summary', asyncHandler(async (req, res) => {
  const service = getMetricsService();
  const summary = service.getSummary();
  
  res.json(summary);
}));

// Generate detailed report
router.get('/report', asyncHandler(async (req, res) => {
  const duration = parseInt(req.query.duration) || 30;
  const service = getMetricsService();
  
  const report = service.generateDetailedReport(duration);
  
  res.json(report);
}));

// Save metrics to file
router.post('/save', asyncHandler(async (req, res) => {
  const duration = parseInt(req.body.duration) || 30;
  const filename = req.body.filename || 'metrics.json';
  
  const service = getMetricsService();
  const report = service.generateDetailedReport(duration);
  
  try {
    const filepath = await service.saveMetrics(report, filename);
    
    res.json({
      success: true,
      message: 'Metrics saved successfully',
      filepath,
      report
    });
  } catch (error) {
    logger.error('Failed to save metrics:', error);
    res.status(500).json({
      error: 'Failed to save metrics',
      message: error.message
    });
  }
}));

// Reset metrics
router.post('/reset', asyncHandler(async (req, res) => {
  const service = getMetricsService();
  service.reset();
  
  res.json({
    success: true,
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString()
  });
}));

// Start/stop metrics collection
router.post('/start', asyncHandler(async (req, res) => {
  const service = getMetricsService();
  service.startCollection();
  
  res.json({
    success: true,
    message: 'Metrics collection started',
    timestamp: new Date().toISOString()
  });
}));

router.post('/stop', asyncHandler(async (req, res) => {
  const service = getMetricsService();
  service.stopCollection();
  
  res.json({
    success: true,
    message: 'Metrics collection stopped',
    timestamp: new Date().toISOString()
  });
}));

// Get real-time metrics (for live updates)
router.get('/live', asyncHandler(async (req, res) => {
  const service = getMetricsService();
  
  // Set up SSE (Server-Sent Events) for real-time updates
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const sendMetrics = () => {
    const metrics = service.getSummary();
    res.write(`data: ${JSON.stringify(metrics)}\n\n`);
  };
  
  // Send initial metrics
  sendMetrics();
  
  // Send updates every 2 seconds
  const interval = setInterval(sendMetrics, 2000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
}));

// Export metrics in different formats
router.get('/export/:format', asyncHandler(async (req, res) => {
  const format = req.params.format.toLowerCase();
  const duration = parseInt(req.query.duration) || 30;
  
  const service = getMetricsService();
  const report = service.generateDetailedReport(duration);
  
  switch (format) {
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.json');
      res.send(JSON.stringify(report, null, 2));
      break;
      
    case 'csv':
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv');
      
      // Convert to CSV format
      const csv = convertToCSV(report);
      res.send(csv);
      break;
      
    default:
      res.status(400).json({
        error: 'Unsupported format',
        supported: ['json', 'csv']
      });
  }
}));

/**
 * Convert metrics report to CSV format
 * @param {Object} report - Metrics report
 * @returns {string} CSV formatted data
 */
function convertToCSV(report) {
  const headers = [
    'Timestamp',
    'Duration (s)',
    'Mode',
    'Total Frames',
    'Processed Frames',
    'FPS',
    'E2E Latency Median (ms)',
    'E2E Latency P95 (ms)',
    'Server Latency Median (ms)',
    'Network Latency Median (ms)',
    'Uplink (kbps)',
    'Downlink (kbps)',
    'Total Detections',
    'Avg Detections per Frame'
  ];
  
  const row = [
    report.timestamp,
    report.duration,
    report.mode,
    report.frames.total,
    report.frames.processed,
    report.fps.processed.toFixed(2),
    report.latency.e2e.median.toFixed(0),
    report.latency.e2e.p95.toFixed(0),
    report.latency.server.median.toFixed(0),
    report.latency.network.median.toFixed(0),
    report.bandwidth.uplink_kbps,
    report.bandwidth.downlink_kbps,
    report.detections.total,
    report.detections.average.toFixed(2)
  ];
  
  return headers.join(',') + '\n' + row.join(',');
}

module.exports = router;
