import logger from '../utils/logger.js';

class AnomalyDetector {
    constructor(database, config) {
        this.db = database;
        this.config = config;
    }

    /**
     * Detect anomalies from monitoring results
     * @param {Object} monitoringResults
     * @returns {Array} Detected anomalies
     */
    detect(monitoringResults) {
        const anomalies = [];

        // Check debug log errors
        if (monitoringResults.debugLogs) {
            const errorAnomalies = this.detectErrorAnomalies(monitoringResults.debugLogs);
            anomalies.push(...errorAnomalies);
        }

        // Check governor limits
        if (monitoringResults.governorLimits) {
            const limitAnomalies = this.detectLimitAnomalies(monitoringResults.governorLimits);
            anomalies.push(...limitAnomalies);
        }

        // Check code quality
        if (monitoringResults.codeQuality) {
            const qualityAnomalies = this.detectQualityAnomalies(monitoringResults.codeQuality);
            anomalies.push(...qualityAnomalies);
        }

        logger.info('Anomaly detection complete', { totalAnomalies: anomalies.length });
        return anomalies;
    }

    /**
     * Detect error rate anomalies
     * @param {Object} debugLogResults
     * @returns {Array} Error anomalies
     */
    detectErrorAnomalies(debugLogResults) {
        const anomalies = [];
        const { errors, summary } = debugLogResults;
        const thresholds = this.config.thresholds.errorRate;

        // Check absolute count
        if (errors.length >= thresholds.absoluteCount) {
            anomalies.push({
                type: 'HIGH_ERROR_RATE',
                severity: 'HIGH',
                description: `${errors.length} errors detected in the last monitoring period`,
                details: {
                    errorCount: errors.length,
                    threshold: thresholds.absoluteCount,
                    errorTypes: summary.errorTypes
                }
            });
        }

        // Check for new error types
        if (summary.uniqueErrorTypes > 5) {
            anomalies.push({
                type: 'MULTIPLE_ERROR_TYPES',
                severity: 'MEDIUM',
                description: `${summary.uniqueErrorTypes} different error types detected`,
                details: {
                    errorTypes: summary.errorTypes
                }
            });
        }

        return anomalies;
    }

    /**
     * Detect governor limit anomalies
     * @param {Object} limitResults
     * @returns {Array} Limit anomalies
     */
    detectLimitAnomalies(limitResults) {
        const anomalies = [];
        const { analysis } = limitResults;

        if (analysis.highUsageCount > 0) {
            for (const usage of analysis.highUsage) {
                let severity = 'MEDIUM';
                if (parseFloat(usage.maxPercent) >= 90) {
                    severity = 'CRITICAL';
                } else if (parseFloat(usage.maxPercent) >= 80) {
                    severity = 'HIGH';
                }

                anomalies.push({
                    type: 'HIGH_GOVERNOR_LIMIT_USAGE',
                    severity,
                    description: `${usage.className} approaching governor limits (${usage.maxPercent}% usage)`,
                    details: {
                        className: usage.className,
                        methodName: usage.methodName,
                        percentages: usage.percentages,
                        maxPercent: usage.maxPercent
                    }
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect code quality anomalies
     * @param {Object} qualityResults
     * @returns {Array} Quality anomalies
     */
    detectQualityAnomalies(qualityResults) {
        const anomalies = [];
        const { issues } = qualityResults;

        for (const issue of issues) {
            let severity = 'LOW';
            if (issue.issues.length >= 3) {
                severity = 'MEDIUM';
            }

            anomalies.push({
                type: 'CODE_QUALITY_ISSUE',
                severity,
                description: `${issue.className} has ${issue.issues.length} quality issue(s)`,
                details: {
                    className: issue.className,
                    issues: issue.issues,
                    metrics: issue.metrics
                }
            });
        }

        return anomalies;
    }
}

export default AnomalyDetector;
