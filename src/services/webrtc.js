const logger = require('../utils/logger');
const config = require('../utils/config');
const { InferenceService } = require('./inference');

class WebRTCService {
  constructor() {
    this.connections = new Map();
    this.frameQueue = [];
    this.isProcessing = false;
    this.inferenceService = new InferenceService();
    
    // Initialize queue processing
    this.startQueueProcessor();
  }

  /**
   * Handle incoming frame from phone
   * @param {string|number} frameId - Frame identifier
   * @param {string} imageData - Base64 encoded image data
   * @param {number} captureTs - Capture timestamp
   * @param {number} recvTs - Receive timestamp
   * @returns {Promise<Object>} Detection result
   */
  async handlePhoneFrame(frameId, imageData, captureTs, recvTs) {
    try {
      // Add frame to queue
      const frame = {
        frameId,
        imageData,
        captureTs,
        recvTs,
        queuedTs: Date.now()
      };

      // Apply backpressure - drop oldest frames if queue is full
      if (this.frameQueue.length >= config.INFERENCE.maxQueueSize) {
        const dropped = this.frameQueue.shift();
        logger.debug(`Dropped frame ${dropped.frameId} due to queue overflow`);
      }

      this.frameQueue.push(frame);
      
      // Process frame immediately if not already processing
      if (!this.isProcessing) {
        return await this.processNextFrame();
      }

      return null;
    } catch (error) {
      logger.error('Error handling phone frame:', error);
      throw error;
    }
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    const targetInterval = 1000 / config.INFERENCE.targetFps;
    
    setInterval(async () => {
      if (!this.isProcessing && this.frameQueue.length > 0) {
        await this.processNextFrame();
      }
    }, targetInterval);
  }

  /**
   * Process next frame in queue
   * @returns {Promise<Object|null>} Detection result or null
   */
  async processNextFrame() {
    if (this.frameQueue.length === 0) {
      return null;
    }

    this.isProcessing = true;

    try {
      // Get latest frame (drop older ones for real-time performance)
      const frame = this.frameQueue.pop();
      this.frameQueue.length = 0; // Clear queue to get latest frame

      const inferenceStartTs = Date.now();
      
      // Run inference
      const detections = await this.inferenceService.detectObjects(frame.imageData);
      
      const inferenceTs = Date.now();

      // Construct result according to API contract
      const result = {
        frame_id: frame.frameId,
        capture_ts: frame.captureTs,
        recv_ts: frame.recvTs,
        inference_ts: inferenceTs,
        detections: detections.map(det => ({
          label: det.label,
          score: det.score,
          xmin: det.bbox[0],
          ymin: det.bbox[1],
          xmax: det.bbox[2],
          ymax: det.bbox[3]
        }))
      };

      logger.debug(`Processed frame ${frame.frameId}:`, {
        detections: result.detections.length,
        latency: inferenceTs - frame.captureTs,
        inferenceTime: inferenceTs - inferenceStartTs
      });

      return result;
    } catch (error) {
      logger.error('Error processing frame:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection stats
   */
  getConnectionStats() {
    return {
      activeConnections: this.connections.size,
      queueLength: this.frameQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Add connection
   * @param {string} id - Connection ID
   * @param {Object} connection - Connection object
   */
  addConnection(id, connection) {
    this.connections.set(id, {
      ...connection,
      connectedAt: Date.now()
    });
    logger.info(`WebRTC connection added: ${id}`);
  }

  /**
   * Remove connection
   * @param {string} id - Connection ID
   */
  removeConnection(id) {
    if (this.connections.has(id)) {
      this.connections.delete(id);
      logger.info(`WebRTC connection removed: ${id}`);
    }
  }

  /**
   * Get connection by ID
   * @param {string} id - Connection ID
   * @returns {Object|null} Connection object or null
   */
  getConnection(id) {
    return this.connections.get(id) || null;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.connections.clear();
    this.frameQueue.length = 0;
    this.isProcessing = false;
    logger.info('WebRTC service cleaned up');
  }
}

module.exports = { WebRTCService };
