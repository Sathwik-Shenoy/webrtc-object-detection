// Phone streaming client for WebRTC Object Detection

class PhoneStreamer {
    constructor() {
        this.socket = null;
        this.localStream = null;
        this.localVideo = null;
        this.isStreaming = false;
        this.frameCount = 0;
        this.sentFrames = 0;
        this.currentFacingMode = 'environment';
        
        // Initialize components
        this.logger = new Logger('stats');
        this.stats = new StatsTracker();
        
        // Configuration
        this.config = {
            mode: 'wasm', // Will be loaded from server
            targetFps: 15,
            quality: 0.7,
            maxWidth: 320,
            maxHeight: 240
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadConfig();
            await this.initializeSocket();
            await this.setupUI();
            this.logger.info('Phone streamer initialized');
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            this.config = {
                ...this.config,
                mode: config.mode,
                targetFps: config.inference.targetFps,
                maxWidth: config.inference.inputSize.width,
                maxHeight: config.inference.inputSize.height
            };
            
            DOMUtils.updateElement('modeDisplay', this.config.mode.toUpperCase());
            this.logger.info(`Config loaded: ${this.config.mode} mode, ${this.config.targetFps}fps`);
        } catch (error) {
            this.logger.error(`Failed to load config: ${error.message}`);
        }
    }
    
    async initializeSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io();
            
            this.socket.on('connect', () => {
                this.logger.info('Connected to server');
                this.updateConnectionStatus('connected');
                resolve();
            });
            
            this.socket.on('disconnect', () => {
                this.logger.info('Disconnected from server');
                this.updateConnectionStatus('disconnected');
            });
            
            this.socket.on('connect_error', (error) => {
                this.logger.error(`Connection error: ${error.message}`);
                this.updateConnectionStatus('disconnected');
                reject(error);
            });
            
            // Handle detection results for local display
            this.socket.on('detection-result', (data) => {
                this.handleDetectionResult(data);
            });
            
            setTimeout(() => {
                if (!this.socket.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }
    
    async setupUI() {
        // Get DOM elements
        this.localVideo = document.getElementById('localVideo');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        
        // Setup event listeners
        document.getElementById('requestPermissionBtn').onclick = () => this.requestCameraPermission();
        document.getElementById('startBtn').onclick = () => this.startStreaming();
        document.getElementById('stopBtn').onclick = () => this.stopStreaming();
        document.getElementById('switchCameraBtn').onclick = () => this.switchCamera();
        document.getElementById('settingsBtn').onclick = () => this.showSettings();
        document.getElementById('retryBtn').onclick = () => this.retry();
        
        // Check for camera permission
        await this.checkCameraPermission();
    }
    
    async checkCameraPermission() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported');
            }
            
            this.logger.info('Requesting camera permissions...');
            
            // Try to get camera stream with more basic constraints first
            const basicConstraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 320 },
                    height: { ideal: 240 }
                },
                audio: false
            };
            
            this.logger.info('Attempting to access camera...');
            const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
            
            // If successful, we have permission
            this.localStream = stream;
            this.logger.info('Camera access granted, setting up video...');
            this.setupVideo();
            
        } catch (error) {
            this.logger.error(`Camera error: ${error.name} - ${error.message}`);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.showPermissionPrompt();
            } else if (error.name === 'NotFoundError') {
                this.showError('No camera found on this device');
            } else if (error.name === 'OverconstrainedError') {
                this.showError('Camera constraints not supported');
            } else {
                this.showError(`Camera error: ${error.message}`);
            }
        }
    }
    
    showPermissionPrompt() {
        DOMUtils.setElementDisplay('loadingScreen', 'none');
        DOMUtils.setElementDisplay('permissionPrompt', 'block');
    }
    
    async requestCameraPermission() {
        try {
            DOMUtils.setElementDisplay('permissionPrompt', 'none');
            DOMUtils.setElementDisplay('loadingScreen', 'block');
            
            this.logger.info('User requested camera permission...');
            
            const basicConstraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 320 },
                    height: { ideal: 240 }
                },
                audio: false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
            this.logger.info('Camera permission granted, setting up video...');
            
            this.setupVideo();
        } catch (error) {
            this.logger.error(`Permission request failed: ${error.name} - ${error.message}`);
            this.showError(`Permission denied: ${error.message}`);
        }
    }
    
    setupVideo() {
        if (!this.localStream || !this.localVideo) {
            this.logger.error('setupVideo: Missing stream or video element');
            return;
        }
        
        this.logger.info('Setting up video element...');
        this.localVideo.srcObject = this.localStream;
        
        this.localVideo.onloadedmetadata = () => {
            this.logger.info('Video metadata loaded');
            const { videoWidth, videoHeight } = this.localVideo;
            this.logger.info(`Video dimensions: ${videoWidth}x${videoHeight}`);
            
            DOMUtils.updateElement('resolutionDisplay', `${videoWidth}x${videoHeight}`);
            
            // Setup overlay canvas
            if (this.overlayCanvas) {
                this.overlayCanvas.width = videoWidth;
                this.overlayCanvas.height = videoHeight;
                this.logger.info('Overlay canvas configured');
            }
            
            // Hide loading and show video
            DOMUtils.setElementDisplay('loadingScreen', 'none');
            DOMUtils.setElementDisplay('videoContainer', 'block');
            DOMUtils.setElementDisplay('stats', 'block');
            
            // Enable controls
            const startBtn = document.getElementById('startBtn');
            const switchBtn = document.getElementById('switchCameraBtn');
            
            if (startBtn) {
                startBtn.disabled = false;
                this.logger.info('Start button enabled');
            }
            if (switchBtn) {
                switchBtn.disabled = false;
                this.logger.info('Switch camera button enabled');
            }
            
            this.logger.info(`Video setup complete: ${videoWidth}x${videoHeight}`);
        };
        
        this.localVideo.onerror = (error) => {
            this.logger.error('Video element error:', error);
            this.showError('Video playback failed');
        };
        
        // Add a timeout to catch cases where onloadedmetadata never fires
        setTimeout(() => {
            if (DOMUtils.getElementDisplay('loadingScreen') !== 'none') {
                this.logger.error('Video setup timeout - metadata never loaded');
                this.showError('Camera initialization timeout');
            }
        }, 10000); // 10 second timeout
    }
    
    async startStreaming() {
        if (this.isStreaming) return;
        
        try {
            this.isStreaming = true;
            this.stats.reset();
            
            // Update UI
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('switchCameraBtn').disabled = true;
            
            this.updateConnectionStatus('connected');
            
            // Start frame capture loop
            this.captureLoop();
            
            this.logger.info('Streaming started');
        } catch (error) {
            this.logger.error(`Failed to start streaming: ${error.message}`);
            this.stopStreaming();
        }
    }
    
    stopStreaming() {
        this.isStreaming = false;
        
        // Update UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('switchCameraBtn').disabled = false;
        
        this.updateConnectionStatus('disconnected');
        this.logger.info('Streaming stopped');
    }
    
    async switchCamera() {
        try {
            // Stop current stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            // Switch facing mode
            this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
            
            // Get new stream
            const constraints = DeviceUtils.getOptimalVideoConstraints('low-resource');
            constraints.video.facingMode = this.currentFacingMode;
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.setupVideo();
            
            this.logger.info(`Switched to ${this.currentFacingMode} camera`);
        } catch (error) {
            this.logger.error(`Failed to switch camera: ${error.message}`);
        }
    }
    
    captureLoop() {
        if (!this.isStreaming) return;
        
        const targetInterval = 1000 / this.config.targetFps;
        
        const capture = async () => {
            if (!this.isStreaming || !this.localVideo) return;
            
            try {
                // Capture frame
                const imageData = ImageUtils.videoToDataURL(this.localVideo, this.config.quality);
                
                // Resize if needed
                const resizedData = await ImageUtils.resizeImage(
                    imageData, 
                    this.config.maxWidth, 
                    this.config.maxHeight
                );
                
                // Send frame
                this.sendFrame(resizedData);
                
                this.frameCount++;
                this.stats.recordSentFrame();
                this.updateStats();
                
            } catch (error) {
                this.logger.error(`Frame capture error: ${error.message}`);
            }
            
            // Schedule next capture
            setTimeout(capture, targetInterval);
        };
        
        capture();
    }
    
    sendFrame(imageData) {
        if (!this.socket || !this.socket.connected) return;
        
        const frameData = {
            frameId: this.frameCount,
            imageData: imageData,
            captureTs: Date.now()
        };
        
        this.socket.emit('phone-stream', frameData);
        this.sentFrames++;
    }
    
    handleDetectionResult(data) {
        if (!data || !this.overlayCanvas) return;
        
        const { frame_id, capture_ts, detections } = data;
        const latency = Date.now() - capture_ts;
        
        this.stats.recordFrame(latency, detections.length);
        
        // Draw overlays
        this.drawDetections(detections);
        
        this.logger.debug(`Frame ${frame_id}: ${detections.length} detections, ${latency}ms latency`);
    }
    
    drawDetections(detections) {
        const ctx = this.overlayCanvas.getContext('2d');
        CanvasUtils.clearCanvas(this.overlayCanvas);
        
        if (!detections || detections.length === 0) return;
        
        const videoWidth = this.localVideo.videoWidth;
        const videoHeight = this.localVideo.videoHeight;
        
        detections.forEach(detection => {
            CanvasUtils.drawBoundingBox(ctx, detection, videoWidth, videoHeight, '#00ff00');
        });
    }
    
    updateStats() {
        const stats = this.stats.getStats();
        
        DOMUtils.updateElement('fpsCounter', stats.sentFPS);
        DOMUtils.updateElement('frameCounter', stats.totalFrames);
        DOMUtils.updateElement('sentCounter', stats.framesSent);
        DOMUtils.updateElement('latencyCounter', `${stats.averageLatency}ms`);
    }
    
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        const statusMessages = {
            connected: '🟢 Connected & Streaming',
            connecting: '🟡 Connecting...',
            disconnected: '🔴 Disconnected'
        };
        
        statusEl.textContent = statusMessages[status] || status;
        statusEl.className = `status ${status}`;
    }
    
    showError(message) {
        DOMUtils.setElementDisplay('loadingScreen', 'none');
        DOMUtils.setElementDisplay('permissionPrompt', 'none');
        DOMUtils.setElementDisplay('videoContainer', 'none');
        DOMUtils.setElementDisplay('errorMessage', 'block');
        
        document.getElementById('errorText').textContent = message;
        this.logger.error(message);
    }
    
    showSettings() {
        // Simple settings dialog
        const settings = prompt(
            `Current Settings:\n` +
            `Mode: ${this.config.mode}\n` +
            `FPS: ${this.config.targetFps}\n` +
            `Quality: ${this.config.quality}\n` +
            `Resolution: ${this.config.maxWidth}x${this.config.maxHeight}\n\n` +
            `Enter new FPS (5-30):`
        );
        
        if (settings) {
            const newFps = parseInt(settings);
            if (newFps >= 5 && newFps <= 30) {
                this.config.targetFps = newFps;
                this.logger.info(`FPS updated to ${newFps}`);
            }
        }
    }
    
    retry() {
        window.location.reload();
    }
    
    cleanup() {
        this.isStreaming = false;
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.logger.info('Phone streamer cleaned up');
    }
}

// Initialize phone streamer when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.phoneStreamer = new PhoneStreamer();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.phoneStreamer) {
        window.phoneStreamer.cleanup();
    }
});
