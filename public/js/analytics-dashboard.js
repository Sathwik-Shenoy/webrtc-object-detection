/**
 * Advanced Analytics Dashboard
 * Real-time charts, heatmaps, and object analytics
 */
class AnalyticsDashboard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            updateInterval: 1000,
            historyLength: 100,
            ...options
        };
        
        this.metrics = {
            fps: [],
            latency: [],
            objectCounts: [],
            detectionHistory: [],
            heatmapData: new Map(),
            objectTrajectories: new Map()
        };
        
        this.charts = {};
        this.logger = new Logger('Analytics');
        this.init();
    }

    init() {
        this.createDashboardLayout();
        this.initializeCharts();
        this.startMetricsCollection();
    }

    createDashboardLayout() {
        this.container.innerHTML = `
            <div class="analytics-dashboard">
                <div class="dashboard-header">
                    <h3>🔬 Real-time Analytics</h3>
                    <div class="dashboard-controls">
                        <button id="exportData" class="btn-secondary">📊 Export</button>
                        <button id="resetAnalytics" class="btn-secondary">🔄 Reset</button>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Performance</h4>
                        <canvas id="performanceChart" width="300" height="150"></canvas>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Object Detection</h4>
                        <canvas id="detectionChart" width="300" height="150"></canvas>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Activity Heatmap</h4>
                        <canvas id="heatmapCanvas" width="300" height="200"></canvas>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Live Statistics</h4>
                        <div id="liveStats" class="stats-container">
                            <div class="stat-item">
                                <span class="stat-label">Objects Detected:</span>
                                <span id="totalObjects" class="stat-value">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Active Tracks:</span>
                                <span id="activeTracks" class="stat-value">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Avg Confidence:</span>
                                <span id="avgConfidence" class="stat-value">0%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Most Common:</span>
                                <span id="commonObject" class="stat-value">-</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="advanced-analytics">
                    <div class="analytics-tabs">
                        <button class="tab-btn active" data-tab="trends">📈 Trends</button>
                        <button class="tab-btn" data-tab="objects">🎯 Objects</button>
                        <button class="tab-btn" data-tab="performance">⚡ Performance</button>
                    </div>
                    
                    <div class="tab-content">
                        <div id="trendsTab" class="tab-panel active">
                            <canvas id="trendsChart" width="600" height="300"></canvas>
                        </div>
                        <div id="objectsTab" class="tab-panel">
                            <div id="objectBreakdown"></div>
                        </div>
                        <div id="performanceTab" class="tab-panel">
                            <div id="performanceMetrics"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners();
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .analytics-dashboard {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 15px;
                margin: 10px 0;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 2px solid rgba(255,255,255,0.2);
                padding-bottom: 10px;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .metric-card {
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 15px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .metric-card h4 {
                margin: 0 0 10px 0;
                color: #fff;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .stats-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .stat-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .stat-label {
                font-size: 12px;
                opacity: 0.8;
            }
            
            .stat-value {
                font-weight: bold;
                font-size: 16px;
                color: #4CAF50;
            }
            
            .analytics-tabs {
                display: flex;
                margin-bottom: 15px;
            }
            
            .tab-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                padding: 10px 20px;
                cursor: pointer;
                border-radius: 5px 5px 0 0;
                margin-right: 5px;
                transition: all 0.3s ease;
            }
            
            .tab-btn.active {
                background: rgba(255,255,255,0.2);
                border-bottom: 2px solid #4CAF50;
            }
            
            .tab-panel {
                display: none;
                background: rgba(255,255,255,0.05);
                padding: 20px;
                border-radius: 0 10px 10px 10px;
                min-height: 300px;
            }
            
            .tab-panel.active {
                display: block;
            }
            
            .btn-secondary {
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 12px;
                margin-left: 10px;
                transition: all 0.3s ease;
            }
            
            .btn-secondary:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }

    initializeCharts() {
        // Performance Chart (FPS + Latency)
        this.charts.performance = this.createChart('performanceChart', {
            type: 'line',
            datasets: [
                { label: 'FPS', color: '#4CAF50', data: [] },
                { label: 'Latency (ms)', color: '#FF9800', data: [] }
            ]
        });

        // Detection Chart (Object counts over time)
        this.charts.detection = this.createChart('detectionChart', {
            type: 'bar',
            datasets: [
                { label: 'Objects', color: '#2196F3', data: [] }
            ]
        });

        // Trends Chart (Advanced metrics)
        this.charts.trends = this.createChart('trendsChart', {
            type: 'line',
            datasets: [
                { label: 'Detection Rate', color: '#E91E63', data: [] },
                { label: 'Confidence', color: '#9C27B0', data: [] }
            ]
        });

        // Initialize heatmap
        this.initHeatmap();
    }

    createChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        return {
            canvas,
            ctx,
            config,
            data: config.datasets.map(() => []),
            maxPoints: 50,
            
            update: function(datasets) {
                datasets.forEach((data, i) => {
                    this.data[i].push(data);
                    if (this.data[i].length > this.maxPoints) {
                        this.data[i].shift();
                    }
                });
                this.render();
            },
            
            render: function() {
                const { width, height } = this.canvas;
                this.ctx.clearRect(0, 0, width, height);
                
                // Simple line chart rendering
                const padding = 40;
                const chartWidth = width - 2 * padding;
                const chartHeight = height - 2 * padding;
                
                this.data.forEach((dataset, i) => {
                    if (dataset.length === 0) return;
                    
                    const color = this.config.datasets[i].color;
                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    
                    const maxVal = Math.max(...dataset, 1);
                    
                    dataset.forEach((value, j) => {
                        const x = padding + (j / (this.maxPoints - 1)) * chartWidth;
                        const y = padding + chartHeight - (value / maxVal) * chartHeight;
                        
                        if (j === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    });
                    
                    this.ctx.stroke();
                });
            }
        };
    }

    initHeatmap() {
        this.heatmapCanvas = document.getElementById('heatmapCanvas');
        this.heatmapCtx = this.heatmapCanvas.getContext('2d');
        this.heatmapData = new Array(30).fill(0).map(() => new Array(20).fill(0));
    }

    updateMetrics(data) {
        const timestamp = Date.now();
        
        // Update performance metrics
        if (data.fps !== undefined) {
            this.metrics.fps.push({ value: data.fps, timestamp });
            this.charts.performance.update([data.fps, data.latency || 0]);
        }
        
        // Update detection metrics
        if (data.detections) {
            const objectCount = data.detections.length;
            this.metrics.objectCounts.push({ value: objectCount, timestamp });
            this.charts.detection.update([objectCount]);
            
            // Update heatmap
            this.updateHeatmap(data.detections);
            
            // Update object statistics
            this.updateObjectStats(data.detections);
        }
        
        // Update trends
        if (data.confidence !== undefined) {
            this.charts.trends.update([data.detectionRate || 0, data.confidence]);
        }
        
        // Update live statistics
        this.updateLiveStats(data);
    }

    updateHeatmap(detections) {
        detections.forEach(detection => {
            const centerX = Math.floor((detection.xmin + detection.xmax) / 2 * 20);
            const centerY = Math.floor((detection.ymin + detection.ymax) / 2 * 30);
            
            if (centerX < 20 && centerY < 30) {
                this.heatmapData[centerY][centerX] += 1;
            }
        });
        
        this.renderHeatmap();
    }

    renderHeatmap() {
        const { width, height } = this.heatmapCanvas;
        const cellWidth = width / 20;
        const cellHeight = height / 30;
        
        this.heatmapCtx.clearRect(0, 0, width, height);
        
        const maxVal = Math.max(...this.heatmapData.flat(), 1);
        
        for (let y = 0; y < 30; y++) {
            for (let x = 0; x < 20; x++) {
                const intensity = this.heatmapData[y][x] / maxVal;
                const alpha = Math.min(intensity, 1);
                
                this.heatmapCtx.fillStyle = `rgba(255, ${Math.floor(255 * (1 - intensity))}, 0, ${alpha})`;
                this.heatmapCtx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            }
        }
    }

    updateLiveStats(data) {
        if (data.trackingStats) {
            document.getElementById('totalObjects').textContent = data.totalDetections || 0;
            document.getElementById('activeTracks').textContent = data.trackingStats.activeTracks || 0;
            document.getElementById('avgConfidence').textContent = 
                `${Math.round((data.avgConfidence || 0) * 100)}%`;
            document.getElementById('commonObject').textContent = 
                data.mostCommonObject || '-';
        }
    }

    updateObjectStats(detections) {
        // Calculate object breakdown
        const objectCounts = {};
        let totalConfidence = 0;
        
        detections.forEach(detection => {
            objectCounts[detection.label] = (objectCounts[detection.label] || 0) + 1;
            totalConfidence += detection.score;
        });
        
        const avgConfidence = detections.length > 0 ? totalConfidence / detections.length : 0;
        const mostCommon = Object.keys(objectCounts).reduce((a, b) => 
            objectCounts[a] > objectCounts[b] ? a : b, '-');
        
        this.updateLiveStats({
            totalDetections: detections.length,
            avgConfidence,
            mostCommonObject: mostCommon
        });
    }

    addEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            }
        });
        
        // Export functionality
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportAnalytics();
        });
        
        // Reset functionality
        document.getElementById('resetAnalytics')?.addEventListener('click', () => {
            this.resetAnalytics();
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    exportAnalytics() {
        const exportData = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            summary: {
                totalFrames: this.metrics.fps.length,
                avgFPS: this.metrics.fps.reduce((sum, m) => sum + m.value, 0) / this.metrics.fps.length,
                avgLatency: this.metrics.latency.reduce((sum, m) => sum + m.value, 0) / this.metrics.latency.length,
                totalDetections: this.metrics.objectCounts.reduce((sum, m) => sum + m.value, 0)
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    resetAnalytics() {
        this.metrics = {
            fps: [],
            latency: [],
            objectCounts: [],
            detectionHistory: [],
            heatmapData: new Map(),
            objectTrajectories: new Map()
        };
        
        this.heatmapData = new Array(30).fill(0).map(() => new Array(20).fill(0));
        Object.values(this.charts).forEach(chart => {
            chart.data = chart.config.datasets.map(() => []);
        });
        
        this.logger.info('Analytics reset');
    }

    startMetricsCollection() {
        setInterval(() => {
            // Auto-update charts
            Object.values(this.charts).forEach(chart => chart.render());
        }, this.options.updateInterval);
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.AnalyticsDashboard = AnalyticsDashboard;
}
