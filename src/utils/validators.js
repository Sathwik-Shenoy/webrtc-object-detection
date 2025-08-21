// Simple validation without external dependencies
// In a production app, you might want to use Joi or another validation library

// Frame data validation schema
/**
 * Validate frame data
 * @param {Object} data - Frame data to validate
 * @returns {Object} Validation result
 */
function validateFrameData(data) {
  const errors = [];
  
  if (!data.frameId && data.frameId !== 0) {
    errors.push('frameId is required');
  }
  
  if (!data.captureTs || typeof data.captureTs !== 'number') {
    errors.push('captureTs must be a number');
  }
  
  if (!data.imageData || typeof data.imageData !== 'string') {
    errors.push('imageData must be a string');
  }
  
  return {
    error: errors.length > 0 ? { details: errors.map(msg => ({ message: msg })) } : null,
    value: data
  };
}

/**
 * Validate detection result
 * @param {Object} result - Detection result to validate
 * @returns {Object} Validation result
 */
function validateDetectionResult(result) {
  const errors = [];
  
  if (!result.frame_id && result.frame_id !== 0) {
    errors.push('frame_id is required');
  }
  
  if (!result.capture_ts || typeof result.capture_ts !== 'number') {
    errors.push('capture_ts must be a number');
  }
  
  if (!result.recv_ts || typeof result.recv_ts !== 'number') {
    errors.push('recv_ts must be a number');
  }
  
  if (!result.inference_ts || typeof result.inference_ts !== 'number') {
    errors.push('inference_ts must be a number');
  }
  
  if (!Array.isArray(result.detections)) {
    errors.push('detections must be an array');
  } else {
    result.detections.forEach((det, i) => {
      if (!det.label || typeof det.label !== 'string') {
        errors.push(`detections[${i}].label must be a string`);
      }
      if (typeof det.score !== 'number' || det.score < 0 || det.score > 1) {
        errors.push(`detections[${i}].score must be a number between 0 and 1`);
      }
      ['xmin', 'ymin', 'xmax', 'ymax'].forEach(coord => {
        if (typeof det[coord] !== 'number' || det[coord] < 0 || det[coord] > 1) {
          errors.push(`detections[${i}].${coord} must be a number between 0 and 1`);
        }
      });
    });
  }
  
  return {
    error: errors.length > 0 ? { details: errors.map(msg => ({ message: msg })) } : null,
    value: result
  };
}

/**
 * Validate metrics data
 * @param {Object} metrics - Metrics data to validate
 * @returns {Object} Validation result
 */
function validateMetrics(metrics) {
  const errors = [];
  
  if (!metrics.timestamp) {
    errors.push('timestamp is required');
  }
  
  if (typeof metrics.duration !== 'number' || metrics.duration <= 0) {
    errors.push('duration must be a positive number');
  }
  
  if (typeof metrics.totalFrames !== 'number' || metrics.totalFrames < 0) {
    errors.push('totalFrames must be a non-negative number');
  }
  
  return {
    error: errors.length > 0 ? { details: errors.map(msg => ({ message: msg })) } : null,
    value: metrics
  };
}

/**
 * Middleware for validating request body
 * @param {Function} validateFn - Validation function
 * @returns {Function} Express middleware function
 */
function validateBody(validateFn) {
  return (req, res, next) => {
    const { error } = validateFn(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }
    next();
  };
}

/**
 * Middleware for validating query parameters
 * @param {Function} validateFn - Validation function
 * @returns {Function} Express middleware function
 */
function validateQuery(validateFn) {
  return (req, res, next) => {
    const { error } = validateFn(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }
    next();
  };
}

module.exports = {
  validateFrameData,
  validateDetectionResult,
  validateMetrics,
  validateBody,
  validateQuery
};
