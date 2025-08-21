/**
 * Smart Alert System
 * Intelligent notifications and monitoring
 */
class SmartAlerts {
    constructor(options = {}) {
        this.options = {
            alertTypes: ['security', 'performance', 'detection', 'system'],
            soundEnabled: true,
            vibrationEnabled: true,
            persistentAlerts: true,
            maxAlerts: 50,
            ...options
        };
        
        this.alerts = [];
        this.rules = new Map();
        this.alertHistory = [];
        this.logger = new Logger('SmartAlerts');
        
        this.init();
    }

    init() {
        this.createAlertInterface();
        this.setupDefaultRules();
        this.setupNotificationPermissions();
    }

    createAlertInterface() {
        // Create floating alert container
        const alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.innerHTML = `
            <div class="alert-system">
                <div class="alert-header">
                    <span class="alert-title">🚨 Smart Alerts</span>
                    <div class="alert-controls">
                        <button id="muteAlerts" class="alert-btn">🔇</button>
                        <button id="clearAlerts" class="alert-btn">🗑️</button>
                        <button id="alertSettings" class="alert-btn">⚙️</button>
                    </div>
                </div>
                <div id="alertList" class="alert-list"></div>
                <div id="alertStats" class="alert-stats">
                    <span id="alertCount">0 active alerts</span>
                </div>
            </div>
            
            <!-- Alert Settings Modal -->
            <div id="alertModal" class="alert-modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Alert Settings</h3>
                        <button id="closeModal" class="close-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="setting-group">
                            <label>
                                <input type="checkbox" id="soundToggle" checked>
                                Enable Sound Alerts
                            </label>
                        </div>
                        <div class="setting-group">
                            <label>
                                <input type="checkbox" id="vibrationToggle" checked>
                                Enable Vibration
                            </label>
                        </div>
                        <div class="setting-group">
                            <label>Alert Sensitivity:</label>
                            <select id="sensitivity">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="setting-group">
                            <h4>Alert Rules</h4>
                            <div id="rulesList"></div>
                            <button id="addRule" class="btn-primary">Add Custom Rule</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(alertContainer);
        this.addAlertStyles();
        this.bindEvents();
    }

    addAlertStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .alert-system {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(15px);
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                z-index: 10000;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .alert-header {
                background: linear-gradient(135deg, #FF6B6B, #FF8E53);
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .alert-title {
                font-weight: bold;
                font-size: 16px;
            }
            
            .alert-controls {
                display: flex;
                gap: 10px;
            }
            
            .alert-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            .alert-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .alert-list {
                max-height: 350px;
                overflow-y: auto;
                padding: 10px;
            }
            
            .alert-item {
                background: rgba(255, 255, 255, 0.1);
                margin-bottom: 10px;
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .alert-item:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateX(5px);
            }
            
            .alert-item.security { border-left-color: #f44336; }
            .alert-item.performance { border-left-color: #ff9800; }
            .alert-item.detection { border-left-color: #4caf50; }
            .alert-item.system { border-left-color: #2196f3; }
            
            .alert-header-text {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .alert-type {
                font-size: 12px;
                opacity: 0.8;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .alert-time {
                font-size: 11px;
                opacity: 0.6;
            }
            
            .alert-message {
                font-size: 14px;
                line-height: 1.4;
            }
            
            .alert-severity {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                margin-left: 8px;
            }
            
            .alert-severity.low { background: rgba(76, 175, 80, 0.3); }
            .alert-severity.medium { background: rgba(255, 152, 0, 0.3); }
            .alert-severity.high { background: rgba(244, 67, 54, 0.3); }
            .alert-severity.critical { background: rgba(156, 39, 176, 0.3); }
            
            .alert-stats {
                padding: 10px 15px;
                background: rgba(255, 255, 255, 0.05);
                font-size: 12px;
                opacity: 0.8;
                text-align: center;
            }
            
            .alert-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(15px);
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                width: 500px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .modal-header {
                background: linear-gradient(135deg, #667eea, #764ba2);
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 15px 15px 0 0;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .setting-group {
                margin-bottom: 20px;
            }
            
            .setting-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            
            .setting-group input, .setting-group select {
                width: 100%;
                padding: 8px;
                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .hidden {
                display: none !important;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            @keyframes alertPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .alert-item.new {
                animation: alertPulse 0.5s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    setupDefaultRules() {
        // Performance rules
        this.addRule('low_fps', {
            type: 'performance',
            condition: (data) => data.fps < 15,
            message: 'Low FPS detected: Performance degradation',
            severity: 'medium',
            cooldown: 5000
        });

        this.addRule('high_latency', {
            type: 'performance',
            condition: (data) => data.latency > 200,
            message: 'High latency detected: Network issues possible',
            severity: 'medium',
            cooldown: 10000
        });

        // Detection rules
        this.addRule('no_detection', {
            type: 'detection',
            condition: (data) => data.timeSinceLastDetection > 30000,
            message: 'No objects detected for 30 seconds',
            severity: 'low',
            cooldown: 30000
        });

        this.addRule('person_detected', {
            type: 'security',
            condition: (data) => data.detections?.some(d => d.label === 'person'),
            message: 'Person detected in video stream',
            severity: 'high',
            cooldown: 2000
        });

        // System rules
        this.addRule('connection_lost', {
            type: 'system',
            condition: (data) => data.connectionStatus === 'disconnected',
            message: 'WebRTC connection lost',
            severity: 'critical',
            cooldown: 1000
        });

        this.addRule('memory_high', {
            type: 'system',
            condition: (data) => data.memoryUsage > 80,
            message: 'High memory usage detected',
            severity: 'medium',
            cooldown: 15000
        });
    }

    addRule(id, rule) {
        rule.id = id;
        rule.lastTriggered = 0;
        this.rules.set(id, rule);
        this.logger.info(`Added alert rule: ${id}`);
    }

    removeRule(id) {
        this.rules.delete(id);
        this.logger.info(`Removed alert rule: ${id}`);
    }

    checkRules(data) {
        const now = Date.now();
        
        this.rules.forEach((rule) => {
            if (now - rule.lastTriggered < (rule.cooldown || 5000)) {
                return; // Still in cooldown
            }
            
            try {
                if (rule.condition(data)) {
                    this.createAlert({
                        type: rule.type,
                        message: rule.message,
                        severity: rule.severity,
                        data: data,
                        ruleId: rule.id
                    });
                    rule.lastTriggered = now;
                }
            } catch (error) {
                this.logger.error(`Error checking rule ${rule.id}:`, error);
            }
        });
    }

    createAlert(alertData) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...alertData
        };

        this.alerts.unshift(alert);
        this.alertHistory.push(alert);

        // Limit active alerts
        if (this.alerts.length > this.options.maxAlerts) {
            this.alerts = this.alerts.slice(0, this.options.maxAlerts);
        }

        this.renderAlert(alert);
        this.updateAlertStats();
        this.triggerNotification(alert);

        this.logger.info(`Alert created: ${alert.type} - ${alert.message}`);
    }

    renderAlert(alert) {
        const alertList = document.getElementById('alertList');
        const alertElement = document.createElement('div');
        alertElement.className = `alert-item ${alert.type} new`;
        alertElement.id = alert.id;
        
        const timeStr = alert.timestamp.toLocaleTimeString();
        const severityClass = alert.severity || 'low';
        
        alertElement.innerHTML = `
            <div class="alert-header-text">
                <span class="alert-type">${alert.type}</span>
                <span class="alert-time">${timeStr}</span>
            </div>
            <div class="alert-message">
                ${alert.message}
                <span class="alert-severity ${severityClass}">${severityClass}</span>
            </div>
        `;

        alertElement.addEventListener('click', () => {
            this.showAlertDetails(alert);
        });

        alertList.insertBefore(alertElement, alertList.firstChild);

        // Remove animation class after animation
        setTimeout(() => {
            alertElement.classList.remove('new');
        }, 500);

        // Auto-remove low severity alerts after some time
        if (alert.severity === 'low') {
            setTimeout(() => {
                this.dismissAlert(alert.id);
            }, 10000);
        }
    }

    dismissAlert(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.style.animation = 'slideOut 0.3s ease-in-out';
            setTimeout(() => {
                alertElement.remove();
                this.alerts = this.alerts.filter(a => a.id !== alertId);
                this.updateAlertStats();
            }, 300);
        }
    }

    updateAlertStats() {
        const alertCount = document.getElementById('alertCount');
        const count = this.alerts.length;
        alertCount.textContent = `${count} active alert${count !== 1 ? 's' : ''}`;
        
        // Update document title with alert count
        if (count > 0) {
            document.title = `(${count}) WebRTC Object Detection`;
        } else {
            document.title = 'WebRTC Object Detection';
        }
    }

    triggerNotification(alert) {
        // Sound notification
        if (this.options.soundEnabled) {
            this.playAlertSound(alert.severity);
        }

        // Vibration
        if (this.options.vibrationEnabled && navigator.vibrate) {
            const pattern = this.getVibrationPattern(alert.severity);
            navigator.vibrate(pattern);
        }

        // Browser notification
        if (Notification.permission === 'granted') {
            const notification = new Notification(`WebRTC Alert: ${alert.type}`, {
                body: alert.message,
                icon: this.getAlertIcon(alert.type),
                tag: alert.id
            });

            notification.onclick = () => {
                window.focus();
                this.showAlertDetails(alert);
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }
    }

    playAlertSound(severity) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const frequencies = {
            low: 200,
            medium: 400,
            high: 600,
            critical: 800
        };

        const frequency = frequencies[severity] || 400;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    getVibrationPattern(severity) {
        const patterns = {
            low: [100],
            medium: [200, 100, 200],
            high: [300, 100, 300, 100, 300],
            critical: [500, 100, 500, 100, 500, 100, 500]
        };
        return patterns[severity] || [200];
    }

    getAlertIcon(type) {
        const icons = {
            security: '🔒',
            performance: '⚡',
            detection: '🎯',
            system: '⚙️'
        };
        return icons[type] || '🚨';
    }

    showAlertDetails(alert) {
        // Create detailed view - could be expanded
        console.log('Alert Details:', alert);
    }

    bindEvents() {
        document.getElementById('muteAlerts')?.addEventListener('click', () => {
            this.options.soundEnabled = !this.options.soundEnabled;
            document.getElementById('muteAlerts').textContent = this.options.soundEnabled ? '🔇' : '🔊';
        });

        document.getElementById('clearAlerts')?.addEventListener('click', () => {
            this.clearAllAlerts();
        });

        document.getElementById('alertSettings')?.addEventListener('click', () => {
            document.getElementById('alertModal').classList.remove('hidden');
        });

        document.getElementById('closeModal')?.addEventListener('click', () => {
            document.getElementById('alertModal').classList.add('hidden');
        });
    }

    clearAllAlerts() {
        this.alerts = [];
        document.getElementById('alertList').innerHTML = '';
        this.updateAlertStats();
        this.logger.info('All alerts cleared');
    }

    setupNotificationPermissions() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                this.logger.info(`Notification permission: ${permission}`);
            });
        }
    }

    // Public API methods
    update(data) {
        this.checkRules(data);
    }

    getAlertStats() {
        return {
            active: this.alerts.length,
            total: this.alertHistory.length,
            byType: this.alertHistory.reduce((acc, alert) => {
                acc[alert.type] = (acc[alert.type] || 0) + 1;
                return acc;
            }, {}),
            bySeverity: this.alertHistory.reduce((acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SmartAlerts = SmartAlerts;
}
