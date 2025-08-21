// Utility functions for WebRTC Object Detection

/**
 * Logger utility
 */
class Logger {
    constructor(containerId = 'logContainer') {
        this.container = document.getElementById(containerId);
        this.maxEntries = 100;
    }
    
    log(message, level = 'info') {
        console.log(`[${level.toUpperCase()}] ${message}`);
        
        if (this.container) {
            const entry = document.createElement('div');
            entry.className = `log-entry ${level}`;
            entry.innerHTML = `<span style="color: #666;">[${new Date().toLocaleTimeString()}]</span> ${message}`;
            
            this.container.appendChild(entry);
            
            // Remove old entries
            while (this.container.children.length > this.maxEntries) {
                this.container.removeChild(this.container.firstChild);
            }
            
            // Scroll to bottom
            this.container.scrollTop = this.container.scrollHeight;
        }
    }
    
    info(message) {
        this.log(message, 'info');
    }
    
    error(message) {
        this.log(message, 'error');
    }
    
    debug(message) {
        this.log(message, 'debug');
    }
}

/**
 * Statistics tracker
 */
class StatsTracker {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.totalFrames = 0;
        this.detectedObjects = 0;
        this.latencies = [];
        this.framesSent = 0;
        this.startTime = Date.now();
        this.lastFrameTime = 0;
    }
    
    recordFrame(latency = 0, detectionsCount = 0) {
        this.totalFrames++;
        this.detectedObjects += detectionsCount;
        
        if (latency > 0) {
            this.latencies.push(latency);
            // Keep only recent latencies
            if (this.latencies.length > 100) {
                this.latencies = this.latencies.slice(-100);
            }
        }
    }
    
    recordSentFrame() {
        this.framesSent++;
        this.lastFrameTime = Date.now();
    }
    
    getAverageLatency() {
        if (this.latencies.length === 0) return 0;
        return Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length);
    }
    
    getCurrentFPS() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        return elapsed > 0 ? Math.round((this.totalFrames / elapsed) * 10) / 10 : 0;
    }
    
    getSentFPS() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        return elapsed > 0 ? Math.round((this.framesSent / elapsed) * 10) / 10 : 0;
    }
    
    getStats() {
        return {
            totalFrames: this.totalFrames,
            detectedObjects: this.detectedObjects,
            averageLatency: this.getAverageLatency(),
            currentFPS: this.getCurrentFPS(),
            sentFPS: this.getSentFPS(),
            framesSent: this.framesSent
        };
    }
}

/**
 * Device detection utilities
 */
const DeviceUtils = {
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    isIOS: () => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    },
    
    isAndroid: () => {
        return /Android/.test(navigator.userAgent);
    },
    
    getSupportedConstraints: () => {
        return navigator.mediaDevices.getSupportedConstraints();
    },
    
    getOptimalVideoConstraints: (mode = 'default') => {
        const isMobile = DeviceUtils.isMobile();
        
        const constraints = {
            video: {
                facingMode: isMobile ? 'environment' : 'user'
            },
            audio: false
        };
        
        if (mode === 'low-resource') {
            constraints.video.width = { ideal: 320 };
            constraints.video.height = { ideal: 240 };
            constraints.video.frameRate = { ideal: 15, max: 15 };
        } else if (mode === 'high-quality') {
            constraints.video.width = { ideal: 1280 };
            constraints.video.height = { ideal: 720 };
            constraints.video.frameRate = { ideal: 30 };
        } else {
            constraints.video.width = { ideal: 640 };
            constraints.video.height = { ideal: 480 };
            constraints.video.frameRate = { ideal: 24 };
        }
        
        return constraints;
    }
};

/**
 * Canvas drawing utilities
 */
const CanvasUtils = {
    drawBoundingBox: (ctx, detection, videoWidth, videoHeight, color = '#00ff00') => {
        const { xmin, ymin, xmax, ymax, label, score } = detection;
        
        // Convert normalized coordinates to pixel coordinates
        const x = xmin * videoWidth;
        const y = ymin * videoHeight;
        const width = (xmax - xmin) * videoWidth;
        const height = (ymax - ymin) * videoHeight;
        
        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label background
        const labelText = `${label} (${Math.round(score * 100)}%)`;
        ctx.font = '14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = 20;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight, textWidth + 10, textHeight);
        
        // Draw label text
        ctx.fillStyle = '#000';
        ctx.fillText(labelText, x + 5, y - 5);
    },
    
    clearCanvas: (canvas) => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    
    resizeCanvas: (canvas, video) => {
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
    }
};

/**
 * Image processing utilities
 */
const ImageUtils = {
    videoToDataURL: (video, quality = 0.8) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0);
        
        return canvas.toDataURL('image/jpeg', quality);
    },
    
    resizeImage: (imageData, maxWidth = 320, maxHeight = 240) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = imageData;
        });
    }
};

/**
 * WebRTC utilities
 */
const WebRTCUtils = {
    getDefaultConfig: () => ({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
    }),
    
    createPeerConnection: (config = null) => {
        const rtcConfig = config || WebRTCUtils.getDefaultConfig();
        return new RTCPeerConnection(rtcConfig);
    },
    
    getConnectionStats: async (peerConnection) => {
        try {
            const stats = await peerConnection.getStats();
            const report = {};
            
            stats.forEach(stat => {
                if (stat.type === 'inbound-rtp' || stat.type === 'outbound-rtp') {
                    report[stat.type] = stat;
                }
            });
            
            return report;
        } catch (error) {
            console.error('Failed to get WebRTC stats:', error);
            return {};
        }
    }
};

/**
 * DOM utilities
 */
const DOMUtils = {
    updateElement: (id, content) => {
        const element = document.getElementById(id);
        if (element) {
            if (typeof content === 'number') {
                element.textContent = content.toString();
            } else {
                element.textContent = content;
            }
        }
    },
    
    setElementDisplay: (id, display) => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = display;
        }
    },
    
    addClass: (id, className) => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add(className);
        }
    },
    
    removeClass: (id, className) => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove(className);
        }
    },
    
    toggleClass: (id, className) => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.toggle(className);
        }
    }
};

/**
 * Performance utilities
 */
const PerformanceUtils = {
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    debounce: (func, delay) => {
        let timeoutId;
        return function() {
            const args = arguments;
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    },
    
    measureTime: (label, func) => {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${label}: ${end - start}ms`);
        return result;
    }
};

// Export utilities for use in other scripts
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.StatsTracker = StatsTracker;
    window.DeviceUtils = DeviceUtils;
    window.CanvasUtils = CanvasUtils;
    window.ImageUtils = ImageUtils;
    window.WebRTCUtils = WebRTCUtils;
    window.DOMUtils = DOMUtils;
    window.PerformanceUtils = PerformanceUtils;
}
