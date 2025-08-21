/**
 * AR-Style 3D Bounding Boxes
 * Advanced 3D visualization with depth estimation
 */
class AR3DBoundingBox {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.options = {
            perspective: 0.7,
            depth: 50,
            shadowOpacity: 0.3,
            animationSpeed: 0.1,
            glowEffect: true,
            particleEffects: true,
            ...options
        };
        
        this.boxes = new Map();
        this.particles = [];
        this.animationFrame = null;
        this.logger = new Logger('AR3D');
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.startAnimation();
        this.logger.info('AR 3D Bounding Box renderer initialized');
    }

    setupCanvas() {
        // Ensure canvas fills container
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Set canvas style for crisp rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    updateDetections(detections, videoElement) {
        const newBoxes = new Map();
        
        detections.forEach((detection, index) => {
            const boxId = detection.id || `box_${index}`;
            
            // Calculate 3D box coordinates
            const box3D = this.calculate3DBox(detection, videoElement);
            
            // Check if box exists for smooth animation
            const existingBox = this.boxes.get(boxId);
            if (existingBox) {
                // Smooth transition
                box3D.animated = this.animateTransition(existingBox, box3D);
            } else {
                // New box - start with animation
                box3D.animated = { ...box3D };
                box3D.scale = 0; // Start small for entrance animation
            }
            
            box3D.detection = detection;
            box3D.timestamp = Date.now();
            newBoxes.set(boxId, box3D);
            
            // Add particle effects for new detections
            if (!existingBox && this.options.particleEffects) {
                this.createParticleEffect(box3D.center);
            }
        });
        
        this.boxes = newBoxes;
    }

    calculate3DBox(detection, videoElement) {
        const { xmin, ymin, xmax, ymax, score, label } = detection;
        
        // Convert normalized coordinates to canvas coordinates
        const x1 = xmin * this.canvas.width;
        const y1 = ymin * this.canvas.height;
        const x2 = xmax * this.canvas.width;
        const y2 = ymax * this.canvas.height;
        
        const width = x2 - x1;
        const height = y2 - y1;
        const area = width * height;
        
        // Estimate depth based on object size and type
        const estimatedDepth = this.estimateDepth(label, area, width, height);
        
        // Calculate 3D perspective points
        const perspective = this.options.perspective;
        const depth = estimatedDepth * this.options.depth;
        
        const frontFace = {
            topLeft: { x: x1, y: y1 },
            topRight: { x: x2, y: y1 },
            bottomLeft: { x: x1, y: y2 },
            bottomRight: { x: x2, y: y2 }
        };
        
        // Back face with perspective offset
        const offset = depth * perspective;
        const backFace = {
            topLeft: { x: x1 - offset, y: y1 - offset },
            topRight: { x: x2 - offset, y: y1 - offset },
            bottomLeft: { x: x1 - offset, y: y2 - offset },
            bottomRight: { x: x2 - offset, y: y2 - offset }
        };
        
        return {
            frontFace,
            backFace,
            center: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
            width,
            height,
            depth: estimatedDepth,
            confidence: score,
            color: this.getObjectColor(label),
            scale: 1,
            rotation: 0,
            glow: 0
        };
    }

    estimateDepth(label, area, width, height) {
        // Depth estimation based on object type and size
        const depthMap = {
            'person': 0.8,
            'car': 1.2,
            'truck': 1.5,
            'bicycle': 0.6,
            'motorcycle': 0.7,
            'airplane': 2.0,
            'bus': 1.8,
            'train': 2.5,
            'boat': 1.3,
            'cat': 0.3,
            'dog': 0.4,
            'bird': 0.2,
            'horse': 1.0,
            'sheep': 0.5,
            'cow': 1.1,
            'elephant': 2.0,
            'bear': 0.9,
            'zebra': 1.0,
            'giraffe': 1.8
        };
        
        const baseDepth = depthMap[label] || 0.5;
        
        // Adjust based on size (smaller objects appear further)
        const canvasArea = this.canvas.width * this.canvas.height;
        const sizeRatio = area / canvasArea;
        const sizeMultiplier = Math.max(0.3, Math.min(1.5, 1 - sizeRatio * 2));
        
        return baseDepth * sizeMultiplier;
    }

    getObjectColor(label) {
        const colors = {
            'person': '#FF6B6B',
            'car': '#4ECDC4',
            'truck': '#45B7D1',
            'bicycle': '#96CEB4',
            'motorcycle': '#FFEAA7',
            'bus': '#DDA0DD',
            'airplane': '#98D8C8',
            'boat': '#F7DC6F',
            'cat': '#BB8FCE',
            'dog': '#85C1E9',
            'bird': '#F8C471',
            'default': '#FFFFFF'
        };
        
        return colors[label] || colors.default;
    }

    animateTransition(from, to) {
        const speed = this.options.animationSpeed;
        
        return {
            frontFace: this.lerpObject(from.animated.frontFace, to.frontFace, speed),
            backFace: this.lerpObject(from.animated.backFace, to.backFace, speed),
            center: this.lerpPoint(from.animated.center, to.center, speed),
            width: this.lerp(from.animated.width, to.width, speed),
            height: this.lerp(from.animated.height, to.height, speed),
            scale: Math.min(1, from.scale + 0.05),
            rotation: from.rotation + 0.02,
            glow: Math.sin(Date.now() * 0.01) * 0.5 + 0.5
        };
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    lerpPoint(a, b, t) {
        return {
            x: this.lerp(a.x, b.x, t),
            y: this.lerp(a.y, b.y, t)
        };
    }

    lerpObject(a, b, t) {
        const result = {};
        for (const key in b) {
            if (typeof b[key] === 'object' && b[key].x !== undefined) {
                result[key] = this.lerpPoint(a[key], b[key], t);
            } else {
                result[key] = this.lerp(a[key], b[key], t);
            }
        }
        return result;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sort boxes by depth (back to front)
        const sortedBoxes = Array.from(this.boxes.values())
            .sort((a, b) => b.depth - a.depth);
        
        sortedBoxes.forEach(box => {
            this.renderBox(box);
        });
        
        // Render particles
        this.renderParticles();
    }

    renderBox(box) {
        const { animated, color, confidence, detection } = box;
        const alpha = confidence * animated.scale;
        
        this.ctx.save();
        
        // Apply glow effect
        if (this.options.glowEffect) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 20 * animated.glow;
        }
        
        // Draw back face (darker)
        this.ctx.strokeStyle = this.adjustColor(color, 0.6);
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = alpha * 0.7;
        this.drawFace(animated.backFace);
        
        // Draw connecting lines
        this.ctx.strokeStyle = this.adjustColor(color, 0.8);
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = alpha * 0.5;
        this.drawConnectingLines(animated.frontFace, animated.backFace);
        
        // Draw front face
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = alpha;
        this.drawFace(animated.frontFace);
        
        // Fill front face with semi-transparent color
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = alpha * 0.1;
        this.fillFace(animated.frontFace);
        
        // Draw label and confidence
        this.ctx.globalAlpha = alpha;
        this.drawLabel(animated.frontFace, detection);
        
        // Draw depth indicator
        this.drawDepthIndicator(animated.center, box.depth, color, alpha);
        
        this.ctx.restore();
    }

    drawFace(face) {
        this.ctx.beginPath();
        this.ctx.moveTo(face.topLeft.x, face.topLeft.y);
        this.ctx.lineTo(face.topRight.x, face.topRight.y);
        this.ctx.lineTo(face.bottomRight.x, face.bottomRight.y);
        this.ctx.lineTo(face.bottomLeft.x, face.bottomLeft.y);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    fillFace(face) {
        this.ctx.beginPath();
        this.ctx.moveTo(face.topLeft.x, face.topLeft.y);
        this.ctx.lineTo(face.topRight.x, face.topRight.y);
        this.ctx.lineTo(face.bottomRight.x, face.bottomRight.y);
        this.ctx.lineTo(face.bottomLeft.x, face.bottomLeft.y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawConnectingLines(front, back) {
        // Top left to top left
        this.ctx.beginPath();
        this.ctx.moveTo(front.topLeft.x, front.topLeft.y);
        this.ctx.lineTo(back.topLeft.x, back.topLeft.y);
        this.ctx.stroke();
        
        // Top right to top right
        this.ctx.beginPath();
        this.ctx.moveTo(front.topRight.x, front.topRight.y);
        this.ctx.lineTo(back.topRight.x, back.topRight.y);
        this.ctx.stroke();
        
        // Bottom left to bottom left
        this.ctx.beginPath();
        this.ctx.moveTo(front.bottomLeft.x, front.bottomLeft.y);
        this.ctx.lineTo(back.bottomLeft.x, back.bottomLeft.y);
        this.ctx.stroke();
        
        // Bottom right to bottom right
        this.ctx.beginPath();
        this.ctx.moveTo(front.bottomRight.x, front.bottomRight.y);
        this.ctx.lineTo(back.bottomRight.x, back.bottomRight.y);
        this.ctx.stroke();
    }

    drawLabel(face, detection) {
        const x = face.topLeft.x;
        const y = face.topLeft.y - 10;
        const text = `${detection.label} ${Math.round(detection.score * 100)}%`;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const metrics = this.ctx.measureText(text);
        this.ctx.fillRect(x - 5, y - 20, metrics.width + 10, 25);
        
        // Text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(text, x, y);
    }

    drawDepthIndicator(center, depth, color, alpha) {
        const size = 20 + depth * 10;
        const x = center.x + 30;
        const y = center.y;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = alpha * 0.6;
        
        // Draw depth circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw depth text
        this.ctx.fillStyle = color;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${depth.toFixed(1)}m`, x, y + 4);
        this.ctx.textAlign = 'left';
    }

    adjustColor(color, factor) {
        // Simple color adjustment
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    createParticleEffect(center) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: center.x,
                y: center.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 360}, 70%, 60%)`
            });
        }
    }

    renderParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            if (particle.life > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return true;
            }
            return false;
        });
    }

    startAnimation() {
        const animate = () => {
            this.render();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    resize() {
        this.setupCanvas();
    }

    // Public API
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    clear() {
        this.boxes.clear();
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy() {
        this.stopAnimation();
        this.clear();
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.AR3DBoundingBox = AR3DBoundingBox;
}
