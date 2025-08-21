// Enhanced Viewer client for WebRTC Object Detection with Advanced Features

class EnhancedDetectionViewer {
    constructor() {
        this.socket = null;
        this.remoteVideo = null;
        this.overlayCanvas = null;
        this.ar3dCanvas = null;
        this.isConnected = false;
        this.showOverlay = true;
        this.frameCount = 0;
        
        // Enhanced features
        this.objectTracker = null;
        this.analyticsDashboard = null;
        this.smartAlerts = null;
        this.ar3dRenderer = null;
        
        // Feature toggles
        this.features = {
            tracking: false,
            analytics: false,
            alerts: true,
            ar3d: false
        };
        
        // Initialize components
        this.logger = new Logger('logContainer');
        this.stats = new StatsTracker();
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupUI();
            await this.initializeSocket();
            await this.initializeEnhancedFeatures();
            await this.loadQRCode();
            this.startStatsUpdater();
            this.logger.info('Enhanced detection viewer initialized with advanced features');
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
        }
    }
    
    async setupUI() {
        // Get DOM elements
        this.remoteVideo = document.getElementById('remoteVideo');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.ar3dCanvas = document.getElementById('ar3dCanvas');
        
        // Setup basic event listeners
        document.getElementById('connectBtn').onclick = () => this.connectPhone();
        document.getElementById('disconnectBtn').onclick = () => this.disconnect();
        document.getElementById('screenshotBtn').onclick = () => this.takeScreenshot();
        document.getElementById('toggleOverlayBtn').onclick = () => this.toggleOverlay();
        document.getElementById('metricsBtn').onclick = () => this.showMetrics();
        
        // Setup enhanced feature toggles
        document.getElementById('toggle3D').onclick = () => this.toggleAR3D();
        document.getElementById('toggleTracking').onclick = () => this.toggleTracking();
        document.getElementById('toggleAnalytics').onclick = () => this.toggleAnalytics();
        document.getElementById('toggleAlerts').onclick = () => this.toggleAlerts();
        
        // Setup video element
        this.remoteVideo.onloadedmetadata = () => {
            this.resizeCanvases();
        };
        
        this.remoteVideo.onresize = () => {
            this.resizeCanvases();
        };
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvases();
        });
    }
    
    async initializeEnhancedFeatures() {
        try {
            // Initialize Object Tracker
            this.objectTracker = new ObjectTracker({
                maxAge: 30,
                minHits: 3,
                iouThreshold: 0.3
            });
            
            // Initialize Analytics Dashboard
            this.analyticsDashboard = new AnalyticsDashboard('analyticsDashboard', {
                updateInterval: 1000,
                historyLength: 100
            });
            
            // Initialize Smart Alerts
            this.smartAlerts = new SmartAlerts({
                alertTypes: ['security', 'performance', 'detection', 'system'],
                soundEnabled: true,
                vibrationEnabled: true
            });
            
            // Initialize AR 3D Renderer
            this.ar3dRenderer = new AR3DBoundingBox('ar3dCanvas', {
                perspective: 0.7,
                depth: 50,
                animationSpeed: 0.1,
                glowEffect: true,
                particleEffects: true
            });
            
            this.logger.info('All enhanced features initialized successfully');
        } catch (error) {
            this.logger.error(`Enhanced features initialization failed: ${error.message}`);
        }
    }
    
    resizeCanvases() {
        if (!this.remoteVideo) return;
        
        const rect = this.remoteVideo.getBoundingClientRect();
        
        // Resize overlay canvas
        if (this.overlayCanvas) {
            this.overlayCanvas.width = rect.width;
            this.overlayCanvas.height = rect.height;
        }
        
        // Resize AR 3D canvas
        if (this.ar3dCanvas) {
            this.ar3dCanvas.width = rect.width;
            this.ar3dCanvas.height = rect.height;
            
            if (this.ar3dRenderer) {
                this.ar3dRenderer.resize();
            }
        }
    }
    
    async initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.logger.info('Connected to server');
            this.updateStatus('Connected to server', 'connected');
        });
        
        this.socket.on('disconnect', () => {
            this.logger.warn('Disconnected from server');
            this.updateStatus('Disconnected from server', 'disconnected');
            this.isConnected = false;
            this.updateButtons();
        });
        
        this.socket.on('phone-connected', (data) => {
            this.logger.info(`Phone connected: ${data.userAgent}`);
            this.updateStatus('📱 Phone connected - Starting detection...', 'connected');
            this.isConnected = true;
            this.updateButtons();
        });
        
        this.socket.on('phone-disconnected', () => {
            this.logger.info('Phone disconnected');
            this.updateStatus('📱 Phone disconnected', 'disconnected');
            this.isConnected = false;
            this.updateButtons();
            
            if (this.remoteVideo && this.remoteVideo.srcObject) {
                this.remoteVideo.srcObject = null;
            }
        });
        
        this.socket.on('offer', async (offer) => {
            await this.handleOffer(offer);
        });
        
        this.socket.on('ice-candidate', async (candidate) => {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
        
        // Enhanced detection result handling
        this.socket.on('detection-result', (result) => {
            this.handleEnhancedDetectionResult(result);
        });
        
        this.socket.on('error', (error) => {
            this.logger.error(`Socket error: ${error.message}`);
            this.updateStatus(`Error: ${error.message}`, 'disconnected');
        });
    }
    
    handleEnhancedDetectionResult(result) {
        try {
            this.frameCount++;
            
            // Update basic stats
            this.stats.updateFrameStats(result);
            
            // Process detections with object tracking
            let processedDetections = result.detections || [];
            
            if (this.features.tracking && this.objectTracker) {
                processedDetections = this.objectTracker.update(processedDetections);
                
                // Update tracking count display
                const trackingCount = document.getElementById('trackingCount');
                if (trackingCount) {
                    trackingCount.textContent = this.objectTracker.getActiveTracks().length;
                }
            }
            
            // Update analytics dashboard
            if (this.features.analytics && this.analyticsDashboard) {
                const analyticsData = {
                    fps: this.stats.getCurrentFPS(),
                    latency: result.latency || 0,
                    detections: processedDetections,
                    confidence: this.calculateAverageConfidence(processedDetections),
                    trackingStats: this.features.tracking ? this.objectTracker.getStats() : null,
                    timestamp: Date.now()
                };
                this.analyticsDashboard.updateMetrics(analyticsData);
            }
            
            // Check smart alerts
            if (this.features.alerts && this.smartAlerts) {
                const alertData = {
                    fps: this.stats.getCurrentFPS(),
                    latency: result.latency || 0,
                    detections: processedDetections,
                    timeSinceLastDetection: Date.now() - (this.lastDetectionTime || Date.now()),
                    connectionStatus: this.isConnected ? 'connected' : 'disconnected',
                    memoryUsage: this.getMemoryUsage()
                };
                this.smartAlerts.update(alertData);
            }
            
            // Update display
            this.drawDetections(processedDetections);
            
            // Update AR 3D if enabled
            if (this.features.ar3d && this.ar3dRenderer) {
                this.ar3dRenderer.updateDetections(processedDetections, this.remoteVideo);
            }
            
            // Update UI metrics
            this.updateDetectionInfo(processedDetections.length, result.latency);
            
            this.lastDetectionTime = Date.now();
            
        } catch (error) {
            this.logger.error(`Error handling detection result: ${error.message}`);
        }
    }
    
    calculateAverageConfidence(detections) {
        if (!detections || detections.length === 0) return 0;
        const total = detections.reduce((sum, d) => sum + (d.score || 0), 0);
        return total / detections.length;
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100;
        }
        return 0;
    }
    
    drawDetections(detections) {
        if (!this.overlayCanvas || !this.showOverlay) return;
        
        const ctx = this.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        detections.forEach((detection, index) => {
            this.drawDetection(ctx, detection, index);
        });
    }
    
    drawDetection(ctx, detection, index) {
        const { xmin, ymin, xmax, ymax, label, score } = detection;
        
        // Convert normalized coordinates to canvas coordinates
        const x = xmin * this.overlayCanvas.width;
        const y = ymin * this.overlayCanvas.height;
        const width = (xmax - xmin) * this.overlayCanvas.width;
        const height = (ymax - ymin) * this.overlayCanvas.height;
        
        // Enhanced styling based on tracking
        const isTracked = detection.trackId !== undefined;
        const confidence = Math.round(score * 100);
        
        // Color coding
        const baseColor = isTracked ? '#4CAF50' : '#FF9800';
        const borderColor = isTracked ? '#2E7D32' : '#F57C00';
        
        // Draw bounding box
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isTracked ? 3 : 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw semi-transparent fill
        ctx.fillStyle = baseColor + '20';
        ctx.fillRect(x, y, width, height);
        
        // Draw label background
        const labelText = isTracked ? 
            `#${detection.trackId} ${label} ${confidence}%` : 
            `${label} ${confidence}%`;
        
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width + 10;
        const textHeight = 20;
        
        ctx.fillStyle = borderColor;
        ctx.fillRect(x, y - textHeight, textWidth, textHeight);
        
        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, x + 5, y - 5);
        
        // Draw track history if available
        if (isTracked && detection.trajectory && this.features.tracking) {
            this.drawTrajectory(ctx, detection.trajectory);
        }
        
        // Draw confidence indicator
        this.drawConfidenceIndicator(ctx, x + width - 30, y + 5, confidence);
    }
    
    drawTrajectory(ctx, trajectory) {
        if (trajectory.length < 2) return;
        
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        trajectory.forEach((point, index) => {
            const x = point.x * this.overlayCanvas.width;
            const y = point.y * this.overlayCanvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    drawConfidenceIndicator(ctx, x, y, confidence) {
        const radius = 8;
        const angle = (confidence / 100) * 2 * Math.PI;
        
        // Background circle
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Confidence arc
        ctx.strokeStyle = confidence > 70 ? '#4CAF50' : confidence > 50 ? '#FF9800' : '#F44336';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI/2, -Math.PI/2 + angle);
        ctx.stroke();
    }
    
    // Feature toggle methods
    toggleTracking() {
        this.features.tracking = !this.features.tracking;
        this.updateFeatureIndicator('tracking', this.features.tracking);
        
        if (this.features.tracking) {
            this.logger.info('Object tracking enabled');
        } else {
            this.logger.info('Object tracking disabled');
            if (this.objectTracker) {
                this.objectTracker.reset();
            }
        }
    }
    
    toggleAnalytics() {
        this.features.analytics = !this.features.analytics;
        this.updateFeatureIndicator('analytics', this.features.analytics);
        
        const dashboard = document.getElementById('analyticsDashboard');
        if (this.features.analytics) {
            dashboard.classList.remove('hidden');
            document.getElementById('featuresStatus').classList.remove('hidden');
            this.logger.info('Analytics dashboard enabled');
        } else {
            dashboard.classList.add('hidden');
            this.logger.info('Analytics dashboard disabled');
        }
    }
    
    toggleAlerts() {
        this.features.alerts = !this.features.alerts;
        this.updateFeatureIndicator('alerts', this.features.alerts);
        
        if (this.features.alerts) {
            this.logger.info('Smart alerts enabled');
        } else {
            this.logger.info('Smart alerts disabled');
            if (this.smartAlerts) {
                this.smartAlerts.clearAllAlerts();
            }
        }
    }
    
    toggleAR3D() {
        this.features.ar3d = !this.features.ar3d;
        this.updateFeatureIndicator('ar3d', this.features.ar3d);
        
        if (this.features.ar3d) {
            this.ar3dCanvas.style.display = 'block';
            this.logger.info('AR 3D mode enabled');
        } else {
            this.ar3dCanvas.style.display = 'none';
            if (this.ar3dRenderer) {
                this.ar3dRenderer.clear();
            }
            this.logger.info('AR 3D mode disabled');
        }
    }
    
    updateFeatureIndicator(feature, enabled) {
        const button = document.getElementById(`toggle${feature.charAt(0).toUpperCase() + feature.slice(1)}`);
        const indicator = document.getElementById(`${feature}Indicator`);
        
        if (button) {
            if (enabled) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
        
        if (indicator) {
            const status = indicator.querySelector('.indicator-status');
            if (status) {
                status.textContent = enabled ? 'ON' : 'OFF';
                status.className = `indicator-status ${enabled ? 'on' : ''}`;
            }
        }
    }
    
    // Enhanced screenshot with features overlay
    async takeScreenshot() {
        if (!this.remoteVideo || !this.remoteVideo.videoWidth) {
            this.logger.warn('No video available for screenshot');
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.remoteVideo.videoWidth;
            canvas.height = this.remoteVideo.videoHeight;
            
            // Draw video frame
            ctx.drawImage(this.remoteVideo, 0, 0);
            
            // Draw overlay if enabled
            if (this.showOverlay && this.overlayCanvas) {
                ctx.drawImage(this.overlayCanvas, 0, 0, canvas.width, canvas.height);
            }
            
            // Draw AR 3D if enabled
            if (this.features.ar3d && this.ar3dCanvas) {
                ctx.drawImage(this.ar3dCanvas, 0, 0, canvas.width, canvas.height);
            }
            
            // Add metadata
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 300, 60);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px Arial';
            ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 20, 30);
            ctx.fillText(`Frame: ${this.frameCount} | FPS: ${this.stats.getCurrentFPS()}`, 20, 50);
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `detection-${Date.now()}.png`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.logger.info('Screenshot saved successfully');
            
        } catch (error) {
            this.logger.error(`Screenshot failed: ${error.message}`);
        }
    }
    
    // Inherit other methods from original viewer
    async connectPhone() {
        if (this.isConnected) {
            this.logger.warn('Already connected to phone');
            return;
        }
        
        this.logger.info('Requesting phone connection...');
        this.socket.emit('request-connection');
    }
    
    disconnect() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.remoteVideo && this.remoteVideo.srcObject) {
            this.remoteVideo.srcObject = null;
        }
        
        this.isConnected = false;
        this.updateButtons();
        this.updateStatus('📱 Disconnected', 'disconnected');
        this.logger.info('Disconnected from phone');
        
        // Reset enhanced features
        if (this.objectTracker) {
            this.objectTracker.reset();
        }
        if (this.ar3dRenderer) {
            this.ar3dRenderer.clear();
        }
    }
    
    toggleOverlay() {
        this.showOverlay = !this.showOverlay;
        const button = document.getElementById('toggleOverlayBtn');
        button.textContent = this.showOverlay ? '👁️ Hide Overlay' : '👁️ Show Overlay';
        
        if (!this.showOverlay) {
            const ctx = this.overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
        
        this.logger.info(`Overlay ${this.showOverlay ? 'enabled' : 'disabled'}`);
    }
    
    updateDetectionInfo(count, latency) {
        document.getElementById('detectionCount').textContent = count;
        document.getElementById('latencyDisplay').textContent = `${latency || 0}ms`;
        document.getElementById('fpsDisplay').textContent = this.stats.getCurrentFPS();
    }
    
    updateStatus(message, className) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${className}`;
        }
    }
    
    updateButtons() {
        document.getElementById('connectBtn').disabled = this.isConnected;
        document.getElementById('disconnectBtn').disabled = !this.isConnected;
        document.getElementById('screenshotBtn').disabled = !this.isConnected;
    }
    
    async handleOffer(offer) {
        try {
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            this.peerConnection.ontrack = (event) => {
                this.remoteVideo.srcObject = event.streams[0];
                this.logger.info('Video stream received');
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice-candidate', event.candidate);
                }
            };
            
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('answer', answer);
            this.logger.info('WebRTC connection established');
            
        } catch (error) {
            this.logger.error(`WebRTC connection failed: ${error.message}`);
        }
    }
    
    async loadQRCode() {
        try {
            const response = await fetch('/api/qr-code');
            const data = await response.json();
            
            const qrContainer = document.getElementById('qrContainer');
            if (qrContainer && data.qrCodeDataURL) {
                qrContainer.innerHTML = `
                    <div class="qr-section">
                        <h3>📱 Scan QR Code with Your Phone</h3>
                        <img src="${data.qrCodeDataURL}" alt="QR Code" style="max-width: 200px;">
                        <p>Or visit: <strong>${data.url}</strong></p>
                    </div>
                `;
            }
        } catch (error) {
            this.logger.error(`Failed to load QR code: ${error.message}`);
        }
    }
    
    showMetrics() {
        const metrics = this.stats.getMetrics();
        alert(`
            Total Frames: ${metrics.totalFrames}
            Average FPS: ${metrics.averageFPS.toFixed(1)}
            Total Objects: ${metrics.totalDetections}
            Average Latency: ${metrics.averageLatency.toFixed(1)}ms
        `);
    }
    
    startStatsUpdater() {
        setInterval(() => {
            const metrics = this.stats.getMetrics();
            
            document.getElementById('totalFrames').textContent = metrics.totalFrames;
            document.getElementById('detectedObjects').textContent = metrics.totalDetections;
            document.getElementById('averageLatency').textContent = `${metrics.averageLatency.toFixed(1)}ms`;
            document.getElementById('currentFPS').textContent = metrics.currentFPS;
            
            if (this.features.tracking && this.objectTracker) {
                document.getElementById('activeTracks').textContent = this.objectTracker.getActiveTracks().length;
            }
        }, 1000);
    }
}

// Initialize the enhanced viewer
document.addEventListener('DOMContentLoaded', () => {
    window.detectionViewer = new EnhancedDetectionViewer();
});
