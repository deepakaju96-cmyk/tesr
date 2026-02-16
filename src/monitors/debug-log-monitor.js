import logger from '../utils/logger.js';

class DebugLogMonitor {
    constructor(connection, config) {
        this.conn = connection;
        this.config = config;
    }

    /**
     * Monitor debug logs for exceptions and errors
     * @returns {Promise<Object>} Monitoring results
     */
    async monitor() {
        try {
            logger.info('Starting debug log monitoring...');

            const errors = await this.queryDebugLogs();
            const summary = this.analyzeErrors(errors);

            logger.info('Debug log monitoring complete', {
                totalErrors: errors.length,
                uniqueErrorTypes: summary.uniqueErrorTypes
            });

            return {
                errors,
                summary
            };
        } catch (error) {
            logger.error('Debug log monitoring failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Query EventLogFile for recent debug logs with errors
     * @returns {Promise<Array>} Error records
     */
    async queryDebugLogs() {
        const hoursAgo = this.config.monitoring.intervals.debugLogHours;
        const sinceDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
        const sinceDateStr = sinceDate.toISOString();

        logger.info('Querying EventLogFile', { since: sinceDateStr });

        try {
            // Query EventLogFile for ApexUnexpectedException events
            const query = `
        SELECT Id, LogDate, EventType, Message
        FROM EventLogFile
        WHERE EventType = 'ApexUnexpectedException'
        AND LogDate >= ${sinceDateStr.split('T')[0]}T00:00:00Z
        ORDER BY LogDate DESC
        LIMIT 1000
      `;

            const result = await this.conn.query(query);

            if (result.totalSize === 0) {
                logger.info('No error log files found');
                return [];
            }

            // In production, you'd download and parse the actual log files
            // For this demo, we'll simulate error extraction
            const errors = [];

            // Also query Apex debug logs directly via Tooling API
            const toolingQuery = `
        SELECT Id, Application, DurationMilliseconds, Location, 
               LogLength, LogUserId, Operation, StartTime, Status
        FROM ApexLog
        WHERE StartTime >= ${sinceDateStr}
        AND Status != 'Success'
        ORDER BY StartTime DESC
        LIMIT 100
      `;

            const toolingResult = await this.conn.tooling.query(toolingQuery);

            for (const log of toolingResult.records) {
                errors.push({
                    timestamp: log.StartTime,
                    logId: log.Id,
                    errorType: log.Status || 'Unknown',
                    errorMessage: log.Operation,
                    className: log.Location || 'Unknown',
                    methodName: '',
                    lineNumber: null
                });
            }

            return errors;
        } catch (error) {
            logger.error('Failed to query debug logs', { error: error.message });
            return [];
        }
    }

    /**
     * Analyze errors to generate summary
     * @param {Array} errors
     * @returns {Object} Error summary
     */
    analyzeErrors(errors) {
        const errorTypes = {};
        const classErrors = {};

        for (const error of errors) {
            // Count by error type
            errorTypes[error.errorType] = (errorTypes[error.errorType] || 0) + 1;

            // Count by class
            if (error.className) {
                classErrors[error.className] = (classErrors[error.className] || 0) + 1;
            }
        }

        return {
            totalErrors: errors.length,
            uniqueErrorTypes: Object.keys(errorTypes).length,
            errorTypes,
            classErrors,
            mostCommonError: Object.keys(errorTypes).sort((a, b) =>
                errorTypes[b] - errorTypes[a]
            )[0] || 'None'
        };
    }
}

export default DebugLogMonitor;
