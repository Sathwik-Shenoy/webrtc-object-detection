/**
 * Advanced Object Tracking System
 * Maintains object identity across frames using IoU tracking
 */
class ObjectTracker {
    constructor(options = {}) {
        this.tracks = new Map(); // trackId -> track object
        this.nextTrackId = 1;
        this.maxAge = options.maxAge || 30; // frames
        this.minHits = options.minHits || 3;
        this.iouThreshold = options.iouThreshold || 0.3;
        this.trackHistory = new Map(); // For trajectory visualization
        this.logger = new Logger('ObjectTracker');
    }

    /**
     * Update tracks with new detections
     */
    update(detections, frameId) {
        const currentTime = Date.now();
        
        // Predict new positions for existing tracks
        this.predict();
        
        // Associate detections with existing tracks
        const matches = this.associate(detections);
        
        // Update matched tracks
        matches.matched.forEach(([trackIdx, detIdx]) => {
            const track = Array.from(this.tracks.values())[trackIdx];
            const detection = detections[detIdx];
            this.updateTrack(track, detection, frameId, currentTime);
        });
        
        // Create new tracks for unmatched detections
        matches.unmatchedDetections.forEach(detIdx => {
            const detection = detections[detIdx];
            this.createTrack(detection, frameId, currentTime);
        });
        
        // Mark unmatched tracks as lost
        matches.unmatchedTracks.forEach(trackIdx => {
            const track = Array.from(this.tracks.values())[trackIdx];
            track.timeSinceUpdate += 1;
        });
        
        // Remove old tracks
        this.pruneOldTracks();
        
        return this.getConfirmedTracks();
    }

    /**
     * Calculate IoU between two bounding boxes
     */
    calculateIoU(box1, box2) {
        const x1 = Math.max(box1.xmin, box2.xmin);
        const y1 = Math.max(box1.ymin, box2.ymin);
        const x2 = Math.min(box1.xmax, box2.xmax);
        const y2 = Math.min(box1.ymax, box2.ymax);
        
        if (x2 <= x1 || y2 <= y1) return 0;
        
        const intersection = (x2 - x1) * (y2 - y1);
        const area1 = (box1.xmax - box1.xmin) * (box1.ymax - box1.ymin);
        const area2 = (box2.xmax - box2.xmin) * (box2.ymax - box2.ymin);
        const union = area1 + area2 - intersection;
        
        return intersection / union;
    }

    /**
     * Associate detections with tracks using Hungarian algorithm (simplified)
     */
    associate(detections) {
        const tracks = Array.from(this.tracks.values());
        const costMatrix = [];
        
        // Build cost matrix (1 - IoU)
        tracks.forEach((track, i) => {
            costMatrix[i] = [];
            detections.forEach((detection, j) => {
                const iou = this.calculateIoU(track.prediction, detection);
                costMatrix[i][j] = 1 - iou;
            });
        });
        
        // Simple greedy assignment (can be improved with Hungarian algorithm)
        const matched = [];
        const unmatchedTracks = new Set(tracks.map((_, i) => i));
        const unmatchedDetections = new Set(detections.map((_, i) => i));
        
        // Find best matches
        for (let i = 0; i < tracks.length; i++) {
            let bestJ = -1;
            let bestCost = Infinity;
            
            for (let j = 0; j < detections.length; j++) {
                if (unmatchedDetections.has(j) && costMatrix[i][j] < bestCost) {
                    bestCost = costMatrix[i][j];
                    bestJ = j;
                }
            }
            
            if (bestJ !== -1 && bestCost < (1 - this.iouThreshold)) {
                matched.push([i, bestJ]);
                unmatchedTracks.delete(i);
                unmatchedDetections.delete(bestJ);
            }
        }
        
        return {
            matched,
            unmatchedTracks: Array.from(unmatchedTracks),
            unmatchedDetections: Array.from(unmatchedDetections)
        };
    }

    /**
     * Predict next position using Kalman filter (simplified)
     */
    predict() {
        this.tracks.forEach(track => {
            // Simple linear prediction
            const dt = 1; // frame time
            track.prediction = {
                xmin: track.bbox.xmin + track.velocity.x * dt,
                ymin: track.bbox.ymin + track.velocity.y * dt,
                xmax: track.bbox.xmax + track.velocity.x * dt,
                ymax: track.bbox.ymax + track.velocity.y * dt
            };
        });
    }

    /**
     * Update track with new detection
     */
    updateTrack(track, detection, frameId, currentTime) {
        // Update velocity
        if (track.bbox) {
            track.velocity = {
                x: (detection.xmin - track.bbox.xmin),
                y: (detection.ymin - track.bbox.ymin)
            };
        }
        
        track.bbox = { ...detection };
        track.score = detection.score;
        track.timeSinceUpdate = 0;
        track.hits += 1;
        track.lastFrameId = frameId;
        track.lastUpdateTime = currentTime;
        
        // Store trajectory for visualization
        if (!this.trackHistory.has(track.id)) {
            this.trackHistory.set(track.id, []);
        }
        const history = this.trackHistory.get(track.id);
        history.push({
            bbox: { ...detection },
            timestamp: currentTime,
            frameId
        });
        
        // Keep only recent history
        if (history.length > 50) {
            history.shift();
        }
    }

    /**
     * Create new track
     */
    createTrack(detection, frameId, currentTime) {
        const track = {
            id: this.nextTrackId++,
            bbox: { ...detection },
            label: detection.label,
            score: detection.score,
            prediction: { ...detection },
            velocity: { x: 0, y: 0 },
            timeSinceUpdate: 0,
            hits: 1,
            age: 0,
            firstFrameId: frameId,
            lastFrameId: frameId,
            createdAt: currentTime,
            lastUpdateTime: currentTime
        };
        
        this.tracks.set(track.id, track);
        this.trackHistory.set(track.id, [{
            bbox: { ...detection },
            timestamp: currentTime,
            frameId
        }]);
        
        this.logger.debug(`Created new track ${track.id} for ${detection.label}`);
    }

    /**
     * Remove old tracks
     */
    pruneOldTracks() {
        const toRemove = [];
        
        this.tracks.forEach((track, id) => {
            track.age += 1;
            
            // Remove if too old or not confirmed
            if (track.timeSinceUpdate > this.maxAge || 
                (track.hits < this.minHits && track.age > 10)) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => {
            this.tracks.delete(id);
            this.trackHistory.delete(id);
            this.logger.debug(`Removed track ${id}`);
        });
    }

    /**
     * Get confirmed tracks only
     */
    getConfirmedTracks() {
        return Array.from(this.tracks.values())
            .filter(track => track.hits >= this.minHits)
            .map(track => ({
                ...track.bbox,
                trackId: track.id,
                label: track.label,
                score: track.score,
                age: track.age,
                velocity: track.velocity,
                trajectory: this.trackHistory.get(track.id) || []
            }));
    }

    /**
     * Get tracking statistics
     */
    getStats() {
        const activeTracks = Array.from(this.tracks.values())
            .filter(track => track.hits >= this.minHits);
        
        const labelCounts = {};
        activeTracks.forEach(track => {
            labelCounts[track.label] = (labelCounts[track.label] || 0) + 1;
        });
        
        return {
            activeTracks: activeTracks.length,
            totalTracks: this.tracks.size,
            labelCounts,
            avgAge: activeTracks.reduce((sum, t) => sum + t.age, 0) / activeTracks.length || 0
        };
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ObjectTracker;
} else if (typeof window !== 'undefined') {
    window.ObjectTracker = ObjectTracker;
}
