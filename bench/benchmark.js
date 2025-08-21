const fs = require('fs');
const path = require('path');

/**
 * Node.js benchmark helper for WebRTC Object Detection
 */
class BenchmarkRunner {
    constructor(options = {}) {
        this.duration = options.duration || 30;
        this.mode = options.mode || 'wasm';
        this.serverUrl = options.serverUrl || 'http://localhost:3000';
        this.outputFile = options.outputFile || 'metrics.json';
        
        this.startTime = null;
        this.endTime = null;
        this.metrics = {
            frames: [],
            errors: [],
            connectionEvents: []
        };
    }
    
    async run() {
        console.log('🚀 Starting Node.js benchmark runner');
        console.log(`Duration: ${this.duration}s`);
        console.log(`Mode: ${this.mode}`);
        console.log(`Server: ${this.serverUrl}`);
        
        try {
            await this.checkServer();
            await this.resetMetrics();
            await this.startCollection();
            await this.runBenchmark();
            await this.stopCollection();
            const report = await this.generateReport();
            await this.saveReport(report);
            
            console.log('✅ Benchmark completed successfully');
            return report;
        } catch (error) {
            console.error('❌ Benchmark failed:', error.message);
            throw error;
        }
    }
    
    async checkServer() {
        const fetch = await import('node-fetch').then(m => m.default);
        
        try {
            const response = await fetch(`${this.serverUrl}/health`);
            if (!response.ok) {
                throw new Error(`Server health check failed: ${response.status}`);
            }
            
            const health = await response.json();
            console.log(`✅ Server healthy (mode: ${health.mode}, uptime: ${Math.round(health.uptime)}s)`);
        } catch (error) {
            throw new Error(`Server not accessible: ${error.message}`);
        }
    }
    
    async resetMetrics() {
        const fetch = await import('node-fetch').then(m => m.default);
        
        const response = await fetch(`${this.serverUrl}/metrics/reset`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to reset metrics: ${response.status}`);
        }
        
        console.log('🔄 Metrics reset');
    }
    
    async startCollection() {
        const fetch = await import('node-fetch').then(m => m.default);
        
        const response = await fetch(`${this.serverUrl}/metrics/start`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to start metrics collection: ${response.status}`);
        }
        
        console.log('📊 Metrics collection started');
    }
    
    async stopCollection() {
        const fetch = await import('node-fetch').then(m => m.default);
        
        const response = await fetch(`${this.serverUrl}/metrics/stop`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to stop metrics collection: ${response.status}`);
        }
        
        console.log('🛑 Metrics collection stopped');
    }
    
    async runBenchmark() {
        console.log('⏱️  Running benchmark...');
        console.log('📱 Please ensure a phone is connected and streaming');
        
        this.startTime = Date.now();
        
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                const elapsed = (Date.now() - this.startTime) / 1000;
                process.stdout.write(`\rProgress: ${elapsed.toFixed(1)}/${this.duration}s`);
                
                if (elapsed >= this.duration) {
                    clearInterval(interval);
                    this.endTime = Date.now();
                    console.log('\n⏰ Benchmark duration completed');
                    resolve();
                }
            }, 100);
        });
    }
    
    async generateReport() {
        const fetch = await import('node-fetch').then(m => m.default);
        
        console.log('📋 Generating metrics report...');
        
        const response = await fetch(`${this.serverUrl}/metrics/report?duration=${this.duration}`);
        
        if (!response.ok) {
            throw new Error(`Failed to generate report: ${response.status}`);
        }
        
        const report = await response.json();
        
        // Add benchmark metadata
        report.benchmark = {
            runner: 'node.js',
            startTime: this.startTime,
            endTime: this.endTime,
            requestedDuration: this.duration,
            actualDuration: (this.endTime - this.startTime) / 1000
        };
        
        return report;
    }
    
    async saveReport(report) {
        const resultsDir = path.join(__dirname, 'results');
        
        // Ensure results directory exists
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const outputPath = path.join(resultsDir, this.outputFile);
        
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`💾 Report saved to ${outputPath}`);
        
        // Also save a timestamped version
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const timestampedPath = path.join(resultsDir, `metrics-${timestamp}.json`);
        fs.writeFileSync(timestampedPath, JSON.stringify(report, null, 2));
        
        return outputPath;
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        
        switch (key) {
            case 'duration':
                options.duration = parseInt(value);
                break;
            case 'mode':
                options.mode = value;
                break;
            case 'server-url':
                options.serverUrl = value;
                break;
            case 'output':
                options.outputFile = value;
                break;
        }
    }
    
    const runner = new BenchmarkRunner(options);
    
    runner.run()
        .then(report => {
            console.log('\n📊 Benchmark Summary:');
            console.log(`Duration: ${report.duration}s`);
            console.log(`Mode: ${report.mode}`);
            console.log(`Frames: ${report.frames?.processed || 0}`);
            console.log(`FPS: ${(report.fps?.processed || 0).toFixed(1)}`);
            console.log(`Median Latency: ${Math.round(report.latency?.e2e?.median || 0)}ms`);
            console.log(`P95 Latency: ${Math.round(report.latency?.e2e?.p95 || 0)}ms`);
            
            process.exit(0);
        })
        .catch(error => {
            console.error('Benchmark failed:', error.message);
            process.exit(1);
        });
}

module.exports = { BenchmarkRunner };
