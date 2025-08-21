// Viewer client for WebRTC Object Detection

class DetectionViewer {
    constructor() {
        this.socket = null;
        this.remoteVideo = null;
        this.overlayCanvas = null;
        this.isConnected = false;
        this.showOverlay = true;
        this.frameCount = 0;
        
        // Initialize components
        this.logger = new Logger('logContainer');
        this.stats = new StatsTracker();
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupUI();
            await this.initializeSocket();
            await this.loadQRCode();
            this.startStatsUpdater();
            this.logger.info('Detection viewer initialized');
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
        }
    }
    
    async setupUI() {
        // Get DOM elements
        this.remoteVideo = document.getElementById('remoteVideo');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        
        // Setup event listeners
        document.getElementById('connectBtn').onclick = () => this.connectPhone();
        document.getElementById('disconnectBtn').onclick = () => this.disconnect();
        document.getElementById('screenshotBtn').onclick = () => this.takeScreenshot();
        document.getElementById('toggleOverlayBtn').onclick = () => this.toggleOverlay();
        document.getElementById('metricsBtn').onclick = () => this.showMetrics();
        
        // Setup video element
        this.remoteVideo.onloadedmetadata = () => {
            this.resizeOverlayCanvas();
        };
        
        this.remoteVideo.onresize = () => {
            this.resizeOverlayCanvas();
        };
    }
    
    async initializeSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io();
            
            this.socket.on('connect', () => {
                this.logger.info('Connected to server');
                resolve();
            });
            
            this.socket.on('disconnect', () => {
                this.logger.info('Disconnected from server');
                this.updateConnectionStatus('disconnected');
            });
            
            this.socket.on('connect_error', (error) => {
                this.logger.error(`Connection error: ${error.message}`);
                reject(error);
            });
            
            // Handle detection results
            this.socket.on('detection-result', (data) => {
                this.handleDetectionResult(data);
            });
            
            // Handle metrics updates
            this.socket.on('metrics-update', (metrics) => {
                this.updateMetricsDisplay(metrics);
            });
            
            setTimeout(() => {
                if (!this.socket.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }
    
    async loadQRCode() {
        try {
            const response = await fetch('/qr');
            const data = await response.json();
            
            document.getElementById('qrCode').innerHTML = 
                `<img src="${data.qrCode}" alt="QR Code" style="max-width: 256px; border-radius: 8px;">`;
            document.getElementById('phoneUrl').textContent = data.phoneUrl;
            
            this.logger.info('QR code loaded');
        } catch (error) {
            this.logger.error(`Failed to load QR code: ${error.message}`);
            document.getElementById('qrCode').innerHTML = 
                `<p style="color: #dc3545;">Failed to load QR code</p>`;
        }
    }
    
    connectPhone() {
        // In a real implementation, this would initiate WebRTC connection
        // For this demo, we'll simulate connection status
        this.updateConnectionStatus('connecting');
        
        setTimeout(() => {
            this.updateConnectionStatus('connected');
            this.isConnected = true;
            
            // Enable controls
            document.getElementById('connectBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = false;
            document.getElementById('screenshotBtn').disabled = false;
            
            this.logger.info('Phone connection established');
        }, 2000);
    }
    
    disconnect() {
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
        
        // Clear video and overlay
        this.remoteVideo.srcObject = null;
        CanvasUtils.clearCanvas(this.overlayCanvas);
        
        // Update controls
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('disconnectBtn').disabled = true;
        document.getElementById('screenshotBtn').disabled = true;
        
        this.logger.info('Disconnected from phone');
    }
    
    handleDetectionResult(data) {
        if (!data) return;
        
        const { frame_id, capture_ts, recv_ts, inference_ts, detections } = data;
        const displayTs = Date.now();
        const e2eLatency = displayTs - capture_ts;
        
        // Update stats
        this.stats.recordFrame(e2eLatency, detections.length);
        this.frameCount++;
        
        // Draw detections
        if (this.showOverlay) {
            this.drawDetections(detections);
        }
        
        // Update detection info display
        this.updateDetectionInfo(detections.length, e2eLatency);
        
        this.logger.debug(`Frame ${frame_id}: ${detections.length} detections, ${e2eLatency}ms E2E`);
    }
    
    drawDetections(detections) {
        if (!this.overlayCanvas || !detections) return;
        
        const ctx = this.overlayCanvas.getContext('2d');
        CanvasUtils.clearCanvas(this.overlayCanvas);
        
        if (!this.showOverlay || detections.length === 0) return;
        
        const videoWidth = this.overlayCanvas.width;
        const videoHeight = this.overlayCanvas.height;
        
        // Draw each detection
        detections.forEach((detection, index) => {
            const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const color = colors[index % colors.length];
            
            CanvasUtils.drawBoundingBox(ctx, detection, videoWidth, videoHeight, color);
        });
    }
    
    resizeOverlayCanvas() {
        if (!this.overlayCanvas || !this.remoteVideo) return;
        
        CanvasUtils.resizeCanvas(this.overlayCanvas, this.remoteVideo);
    }
    
    updateDetectionInfo(detectionsCount, latency) {
        const detectionInfo = document.getElementById('detectionInfo');
        
        if (detectionsCount > 0 || this.isConnected) {
            detectionInfo.style.display = 'block';
            DOMUtils.updateElement('detectionCount', detectionsCount);
            DOMUtils.updateElement('latencyDisplay', `${latency}ms`);
            DOMUtils.updateElement('fpsDisplay', this.stats.getCurrentFPS());
        } else {
            detectionInfo.style.display = 'none';
        }
    }
    
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        const statusMessages = {
            connected: '🟢 Phone Connected & Streaming',
            connecting: '🟡 Connecting to phone...',
            disconnected: '🔴 Waiting for phone connection...'
        };
        
        statusEl.textContent = statusMessages[status] || status;
        statusEl.className = `status ${status}`;
    }
    
    startStatsUpdater() {
        setInterval(() => {
            if (this.isConnected) {
                this.updateStatsDisplay();
            }
        }, 1000);
    }
    
    updateStatsDisplay() {
        const stats = this.stats.getStats();
        
        DOMUtils.updateElement('totalFrames', stats.totalFrames);
        DOMUtils.updateElement('detectedObjects', stats.detectedObjects);
        DOMUtils.updateElement('averageLatency', `${stats.averageLatency}ms`);
        DOMUtils.updateElement('currentFPS', stats.currentFPS);
    }
    
    updateMetricsDisplay(metrics) {
        // Update real-time metrics if provided
        if (metrics) {
            DOMUtils.updateElement('totalFrames', metrics.totalFrames || 0);
            DOMUtils.updateElement('currentFPS', Math.round(metrics.fps * 10) / 10 || 0);
            
            if (metrics.latency) {
                DOMUtils.updateElement('averageLatency', `${Math.round(metrics.latency.median)}ms`);
            }
        }
    }
    
    takeScreenshot() {
        if (!this.remoteVideo) return;
        
        try {
            // Create canvas with video frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.remoteVideo.videoWidth || this.remoteVideo.clientWidth;
            canvas.height = this.remoteVideo.videoHeight || this.remoteVideo.clientHeight;
            
            // Draw video frame
            ctx.drawImage(this.remoteVideo, 0, 0, canvas.width, canvas.height);
            
            // Draw overlay if enabled
            if (this.showOverlay && this.overlayCanvas) {
                ctx.drawImage(this.overlayCanvas, 0, 0);
            }
            
            // Download screenshot
            const link = document.createElement('a');
            link.download = `detection-screenshot-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            this.logger.info('Screenshot captured');
        } catch (error) {
            this.logger.error(`Screenshot failed: ${error.message}`);
        }
    }
    
    toggleOverlay() {
        this.showOverlay = !this.showOverlay;
        
        const btn = document.getElementById('toggleOverlayBtn');
        btn.textContent = this.showOverlay ? '👁️ Hide Overlay' : '👁️ Show Overlay';
        
        if (!this.showOverlay) {
            CanvasUtils.clearCanvas(this.overlayCanvas);
        }
        
        this.logger.info(`Overlay ${this.showOverlay ? 'enabled' : 'disabled'}`);
    }
    
    async showMetrics() {
        try {
            const response = await fetch('/metrics/summary');
            const metrics = await response.json();
            
            const metricsWindow = window.open('', '_blank', 'width=600,height=400');
            metricsWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Detection Metrics</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
                        .value { font-weight: bold; color: #007bff; }
                    </style>
                </head>
                <body>
                    <h2>📊 Real-time Metrics</h2>
                    <div class="metric">
                        <strong>Status:</strong> <span class="value">${metrics.isCollecting ? 'Collecting' : 'Stopped'}</span>
                    </div>
                    <div class="metric">
                        <strong>Duration:</strong> <span class="value">${Math.round(metrics.duration)}s</span>
                    </div>
                    <div class="metric">
                        <strong>Total Frames:</strong> <span class="value">${metrics.totalFrames}</span>
                    </div>
                    <div class="metric">
                        <strong>Processed Frames:</strong> <span class="value">${metrics.processedFrames}</span>
                    </div>
                    <div class="metric">
                        <strong>Dropped Frames:</strong> <span class="value">${metrics.droppedFrames}</span>
                    </div>
                    <div class="metric">
                        <strong>Average FPS:</strong> <span class="value">${Math.round(metrics.fps * 10) / 10}</span>
                    </div>
                    <div class="metric">
                        <strong>Median Latency:</strong> <span class="value">${Math.round(metrics.latency.median)}ms</span>
                    </div>
                    <div class="metric">
                        <strong>P95 Latency:</strong> <span class="value">${Math.round(metrics.latency.p95)}ms</span>
                    </div>
                    
                    <button onclick="window.location.href='/metrics'">View Full Metrics</button>
                    <button onclick="window.close()">Close</button>
                </body>
                </html>
            `);
            
            this.logger.info('Metrics window opened');
        } catch (error) {
            this.logger.error(`Failed to load metrics: ${error.message}`);
            alert('Failed to load metrics. Check console for details.');
        }
    }
    
    cleanup() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.logger.info('Detection viewer cleaned up');
    }
}

// Initialize viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.detectionViewer = new DetectionViewer();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.detectionViewer) {
        window.detectionViewer.cleanup();
    }
});
