// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const QRCode = require('qrcode');

// Import custom modules
const logger = require('./src/utils/logger');
const config = require('./src/utils/config');
const { corsMiddleware } = require('./src/middleware/cors');
const { errorHandler } = require('./src/middleware/errorHandler');

// Import routes
const indexRoutes = require('./src/routes/index');
const apiRoutes = require('./src/routes/api');
const metricsRoutes = require('./src/routes/metrics');

// Import services
const { WebRTCService } = require('./src/services/webrtc');
const { MetricsService } = require('./src/services/metrics');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize services
const webrtcService = new WebRTCService();
const metricsService = new MetricsService();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));

// Basic middleware
app.use(compression());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/metrics', metricsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: config.MODE,
    uptime: process.uptime()
  });
});

// Function to get local IP address
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  
  // Return the first external IPv4 address found
  for (const name of Object.keys(results)) {
    if (results[name].length > 0) {
      return results[name][0];
    }
  }
  
  return 'localhost'; // fallback
}

// Generate QR code for phone connection
app.get('/qr', async (req, res) => {
  try {
    const host = req.get('host');
    let baseUrl;
    
    // If the request is coming from localhost, use the local IP for QR code
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const localIP = getLocalIP();
      const port = host.split(':')[1] || '3000';
      baseUrl = `${req.protocol}://${localIP}:${port}`;
    } else {
      baseUrl = `${req.protocol}://${host}`;
    }
    
  const phoneUrl = `${baseUrl}/phone-connect.html`;
    
    const qrCode = await QRCode.toDataURL(phoneUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({
      phoneUrl,
      qrCode
    });
  } catch (error) {
    logger.error('QR code generation failed:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Handle phone streaming
  socket.on('phone-stream', (data) => {
    try {
      const { frameId, imageData, captureTs } = data;
      const recvTs = Date.now();
      
      // Process frame and emit to viewers
      webrtcService.handlePhoneFrame(frameId, imageData, captureTs, recvTs)
        .then(result => {
          socket.broadcast.emit('detection-result', result);
          metricsService.recordFrame(result);
        })
        .catch(error => {
          logger.error('Frame processing error:', error);
        });
    } catch (error) {
      logger.error('Phone stream error:', error);
    }
  });
  
  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });
  
  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });
  
  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });
  
  // Handle metrics requests
  socket.on('request-metrics', () => {
    const metrics = metricsService.getCurrentMetrics();
    socket.emit('metrics-update', metrics);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.PORT;
server.listen(PORT, () => {
  const localIP = getLocalIP();
  logger.info(`🚀 WebRTC Object Detection Server running on port ${PORT}`);
  logger.info(`💻 Viewer URL (local): http://localhost:${PORT}`);
  logger.info(`📱 Phone URL (local): http://localhost:${PORT}/phone-connect.html`);
  logger.info(`💻 Viewer URL (network): http://${localIP}:${PORT}`);
  logger.info(`📱 Phone URL (network): http://${localIP}:${PORT}/phone-connect.html`);
  logger.info(`🧠 Inference mode: ${config.MODE}`);
  logger.info(`🔗 Scan QR code at: http://localhost:${PORT}/qr`);
  
  if (config.NODE_ENV === 'development') {
    logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
    logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
