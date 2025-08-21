const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../utils/config');

class MetricsService {
  constructor() {
    this.metrics = {
      frames: [],
      startTime: null,
      endTime: null,
      totalFrames: 0,
      processedFrames: 0,
      droppedFrames: 0
    };
    
    this.isCollecting = false;
    this.reportTimer = null;
    
    this.startCollection();
  }

  /**
   * Start metrics collection
   */
  startCollection() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.metrics.startTime = Date.now();
    
    // Periodic reporting
    if (config.METRICS.enabled) {
      // Clear any existing timer first
      if (this.reportTimer) {
        clearInterval(this.reportTimer);
      }
      this.reportTimer = setInterval(() => {
        this.generateReport();
      }, config.METRICS.reportInterval);
    }
    
    logger.info('Metrics collection started');
  }

  /**
   * Stop metrics collection
   */
  stopCollection() {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    this.metrics.endTime = Date.now();
    
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    logger.info('Metrics collection stopped');
  }

  /**
   * Record a processed frame
   * @param {Object} frameResult - Frame processing result
   */
  recordFrame(frameResult) {
    if (!this.isCollecting || !frameResult) return;
    
    const now = Date.now();
    const frameMetrics = {
      frameId: frameResult.frame_id,
      captureTs: frameResult.capture_ts,
      recvTs: frameResult.recv_ts,
      inferenceTs: frameResult.inference_ts,
      displayTs: now,
      e2eLatency: now - frameResult.capture_ts,
      serverLatency: frameResult.inference_ts - frameResult.recv_ts,
      networkLatency: frameResult.recv_ts - frameResult.capture_ts,
      detectionsCount: frameResult.detections ? frameResult.detections.length : 0
    };
    
    this.metrics.frames.push(frameMetrics);
    this.metrics.processedFrames++;
    
    // Keep only recent frames to prevent memory issues
    const maxFrames = config.METRICS.windowSize * config.INFERENCE.targetFps;
    if (this.metrics.frames.length > maxFrames) {
      this.metrics.frames = this.metrics.frames.slice(-maxFrames);
    }
  }

  /**
   * Record a dropped frame
   */
  recordDroppedFrame() {
    if (!this.isCollecting) return;
    this.metrics.droppedFrames++;
  }

  /**
   * Increment total frames counter
   */
  recordTotalFrame() {
    if (!this.isCollecting) return;
    this.metrics.totalFrames++;
  }

  /**
   * Calculate latency statistics
   * @param {Array} latencies - Array of latency values
   * @returns {Object} Latency statistics
   */
  calculateLatencyStats(latencies) {
    if (latencies.length === 0) {
      return { median: 0, p95: 0, min: 0, max: 0, avg: 0 };
    }
    
    const sorted = latencies.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    
    return { median, p95, min, max, avg };
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getCurrentMetrics() {
    const now = Date.now();
    const duration = now - (this.metrics.startTime || now);
    const durationSeconds = duration / 1000;
    
    // Calculate FPS
    const fps = durationSeconds > 0 ? this.metrics.processedFrames / durationSeconds : 0;
    
    // Calculate latency statistics
    const e2eLatencies = this.metrics.frames.map(f => f.e2eLatency);
    const serverLatencies = this.metrics.frames.map(f => f.serverLatency);
    const networkLatencies = this.metrics.frames.map(f => f.networkLatency);
    
    return {
      timestamp: new Date().toISOString(),
      duration: duration,
      durationSeconds: durationSeconds,
      totalFrames: this.metrics.totalFrames,
      processedFrames: this.metrics.processedFrames,
      droppedFrames: this.metrics.droppedFrames,
      averageFps: fps,
      currentWindowSize: this.metrics.frames.length,
      latency: {
        e2e: this.calculateLatencyStats(e2eLatencies),
        server: this.calculateLatencyStats(serverLatencies),
        network: this.calculateLatencyStats(networkLatencies)
      },
      detections: {
        total: this.metrics.frames.reduce((sum, f) => sum + f.detectionsCount, 0),
        average: this.metrics.frames.length > 0 
          ? this.metrics.frames.reduce((sum, f) => sum + f.detectionsCount, 0) / this.metrics.frames.length 
          : 0
      }
    };
  }

  /**
   * Generate detailed metrics report
   * @param {number} duration - Duration in seconds for the report
   * @returns {Object} Detailed metrics report
   */
  generateDetailedReport(duration = 30) {
    const endTime = Date.now();
    const startTime = endTime - (duration * 1000);
    
    // Filter frames within the specified duration
    const relevantFrames = this.metrics.frames.filter(
      f => f.displayTs >= startTime && f.displayTs <= endTime
    );
    
    if (relevantFrames.length === 0) {
      return {
        error: 'No frames processed in the specified duration',
        duration: duration,
        timestamp: new Date().toISOString()
      };
    }
    
    const actualDuration = (endTime - startTime) / 1000;
    const fps = relevantFrames.length / actualDuration;
    
    // Calculate latencies
    const e2eLatencies = relevantFrames.map(f => f.e2eLatency);
    const serverLatencies = relevantFrames.map(f => f.serverLatency);
    const networkLatencies = relevantFrames.map(f => f.networkLatency);
    
    // Estimate bandwidth (rough calculation)
    const avgImageSize = 50 * 1024; // Assume ~50KB per frame
    const uplinkKbps = (relevantFrames.length * avgImageSize * 8) / (actualDuration * 1024);
    const downlinkKbps = uplinkKbps * 0.1; // Response data is much smaller
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: actualDuration,
      mode: config.MODE,
      frames: {
        total: relevantFrames.length,
        processed: relevantFrames.length,
        dropped: 0 // Would need more sophisticated tracking
      },
      fps: {
        processed: fps,
        target: config.INFERENCE.targetFps
      },
      latency: {
        e2e: this.calculateLatencyStats(e2eLatencies),
        server: this.calculateLatencyStats(serverLatencies),
        network: this.calculateLatencyStats(networkLatencies)
      },
      bandwidth: {
        uplink_kbps: Math.round(uplinkKbps),
        downlink_kbps: Math.round(downlinkKbps)
      },
      detections: {
        total: relevantFrames.reduce((sum, f) => sum + f.detectionsCount, 0),
        average: relevantFrames.reduce((sum, f) => sum + f.detectionsCount, 0) / relevantFrames.length
      },
      performance: {
        cpu_usage: 'N/A', // Would need system monitoring
        memory_usage: process.memoryUsage(),
        gc_stats: 'N/A'
      }
    };
    
    return report;
  }

  /**
   * Save metrics to file
   * @param {Object} metrics - Metrics data to save
   * @param {string} filename - Output filename
   */
  async saveMetrics(metrics, filename = 'metrics.json') {
    try {
      const outputPath = path.join(config.PATHS.results, filename);
      
      // Ensure results directory exists
      if (!fs.existsSync(config.PATHS.results)) {
        fs.mkdirSync(config.PATHS.results, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
      logger.info(`Metrics saved to ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      logger.error('Failed to save metrics:', error);
      throw error;
    }
  }

  /**
   * Generate and log current report
   */
  generateReport() {
    const metrics = this.getCurrentMetrics();
    logger.info('Metrics Report:', {
      fps: Math.round(metrics.averageFps * 100) / 100,
      processedFrames: metrics.processedFrames,
      droppedFrames: metrics.droppedFrames,
      e2eLatency: `${Math.round(metrics.latency.e2e.median)}ms (median)`,
      duration: `${Math.round(metrics.durationSeconds)}s`
    });
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      frames: [],
      startTime: Date.now(),
      endTime: null,
      totalFrames: 0,
      processedFrames: 0,
      droppedFrames: 0
    };
    
    logger.info('Metrics reset');
  }

  /**
   * Get metrics summary for API
   * @returns {Object} Metrics summary
   */
  getSummary() {
    const current = this.getCurrentMetrics();
    return {
      isCollecting: this.isCollecting,
      duration: current.durationSeconds,
      fps: current.averageFps,
      totalFrames: current.totalFrames,
      processedFrames: current.processedFrames,
      droppedFrames: current.droppedFrames,
      latency: {
        median: current.latency.e2e.median,
        p95: current.latency.e2e.p95
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopCollection();
    this.metrics.frames = [];
    logger.info('Metrics service cleaned up');
  }
}

module.exports = { MetricsService };
