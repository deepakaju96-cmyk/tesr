import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import salesforceAuth from './auth/salesforce-auth.js';
import MonitoringDatabase from './storage/database.js';
import DebugLogMonitor from './monitors/debug-log-monitor.js';
import GovernorLimitMonitor from './monitors/governor-limit-monitor.js';
import CodeQualityMonitor from './monitors/code-quality-monitor.js';
import AnomalyDetector from './analyzers/anomaly-detector.js';
import Notifier from './notifications/notifier.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MonitoringOrchestrator {
    constructor() {
        // Load config
        const configPath = path.join(__dirname, '../config.json');
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        this.db = null;
        this.notifier = null;
    }

    /**
     * Initialize all services
     */
    async initialize() {
        try {
            logger.info('Initializing monitoring orchestrator...');

            // Initialize database
            this.db = new MonitoringDatabase(this.config.storage.database);
            this.db.initialize();

            // Initialize notifier
            this.notifier = new Notifier(this.config);

            // Authenticate to Salesforce
            await salesforceAuth.authenticate();

            logger.info('Orchestrator initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize orchestrator', { error: error.message });
            throw error;
        }
    }

    /**
     * Run a complete monitoring cycle
     */
    async run() {
        const startTime = Date.now();
        let runId;

        try {
            logger.info('='.repeat(60));
            logger.info('Starting monitoring run');
            logger.info('='.repeat(60));

            runId = this.db.startRun();
            const conn = salesforceAuth.getConnection();
            const results = {};

            // Run debug log monitoring
            if (this.config.monitoring.enabled.debugLogs) {
                const debugLogMonitor = new DebugLogMonitor(conn, this.config);
                results.debugLogs = await debugLogMonitor.monitor();

                if (results.debugLogs.errors.length > 0) {
                    this.db.insertDebugLogErrors(runId, results.debugLogs.errors);
                }
            }

            // Run governor limit monitoring
            if (this.config.monitoring.enabled.governorLimits) {
                const governorLimitMonitor = new GovernorLimitMonitor(conn, this.config);
                results.governorLimits = await governorLimitMonitor.monitor();

                if (results.governorLimits.limitData.length > 0) {
                    this.db.insertGovernorLimits(runId, results.governorLimits.limitData);
                }
            }

            // Run code quality monitoring
            if (this.config.monitoring.enabled.codeQuality) {
                const codeQualityMonitor = new CodeQualityMonitor(conn, this.config);
                results.codeQuality = await codeQualityMonitor.monitor();
            }

            // Detect anomalies
            const anomalyDetector = new AnomalyDetector(this.db, this.config);
            const anomalies = anomalyDetector.detect(results);

            if (anomalies.length > 0) {
                this.db.insertAnomalies(runId, anomalies);
            }

            // Send notifications
            await this.notifier.notify(anomalies, results);

            const duration = Date.now() - startTime;
            this.db.endRun(runId, 'completed', duration);

            logger.info('='.repeat(60));
            logger.info('Monitoring run completed successfully', {
                duration: `${duration}ms`,
                anomalies: anomalies.length
            });
            logger.info('='.repeat(60));

            return {
                success: true,
                runId,
                duration,
                anomalies: anomalies.length,
                results
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            if (runId) {
                this.db.endRun(runId, 'failed', duration);
            }

            logger.error('Monitoring run failed', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.db) {
            this.db.close();
        }
        logger.info('Cleanup complete');
    }
}

export default MonitoringOrchestrator;
