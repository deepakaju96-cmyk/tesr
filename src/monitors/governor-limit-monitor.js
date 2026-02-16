import logger from '../utils/logger.js';

class GovernorLimitMonitor {
    constructor(connection, config) {
        this.conn = connection;
        this.config = config;
    }

    /**
     * Monitor governor limit usage from debug logs
     * @returns {Promise<Object>} Monitoring results
     */
    async monitor() {
        try {
            logger.info('Starting governor limit monitoring...');

            const limitData = await this.extractLimitData();
            const analysis = this.analyzeLimits(limitData);

            logger.info('Governor limit monitoring complete', {
                totalRecords: limitData.length,
                highUsageCount: analysis.highUsageCount
            });

            return {
                limitData,
                analysis
            };
        } catch (error) {
            logger.error('Governor limit monitoring failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Extract governor limit data from debug logs
     * @returns {Promise<Array>} Limit usage records
     */
    async extractLimitData() {
        try {
            // Query recent Apex logs via Tooling API
            const hoursAgo = this.config.monitoring.intervals.debugLogHours;
            const sinceDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
            const sinceDateStr = sinceDate.toISOString();

            const query = `
        SELECT Id, Application, DurationMilliseconds, Location,
               LogLength, Operation, StartTime
        FROM ApexLog
        WHERE StartTime >= ${sinceDateStr}
        ORDER BY StartTime DESC
        LIMIT 500
      `;

            const result = await this.conn.tooling.query(query);

            // In production, you'd download and parse the actual log files
            // to extract LIMIT_USAGE_FOR_NS lines
            // For this demo, we'll create sample data based on what we can get
            const limitData = [];

            for (const log of result.records) {
                // Simulate governor limit extraction
                // In real implementation, you'd parse the log body
                limitData.push({
                    timestamp: log.StartTime,
                    className: log.Location || 'Unknown',
                    methodName: log.Operation || '',
                    soqlQueriesUsed: Math.floor(Math.random() * 100),
                    soqlQueriesLimit: 100,
                    dmlStatementsUsed: Math.floor(Math.random() * 150),
                    dmlStatementsLimit: 150,
                    cpuTimeUsed: log.DurationMilliseconds || 0,
                    cpuTimeLimit: 10000,
                    heapSizeUsed: Math.floor(Math.random() * 6000000),
                    heapSizeLimit: 6000000
                });
            }

            return limitData;
        } catch (error) {
            logger.error('Failed to extract limit data', { error: error.message });
            return [];
        }
    }

    /**
     * Analyze governor limits for high usage
     * @param {Array} limitData
     * @returns {Object} Analysis results
     */
    analyzeLimits(limitData) {
        const thresholds = this.config.thresholds.governorLimits;
        const highUsage = [];
        const byClass = {};

        for (const data of limitData) {
            const soqlPercent = (data.soqlQueriesUsed / data.soqlQueriesLimit) * 100;
            const dmlPercent = (data.dmlStatementsUsed / data.dmlStatementsLimit) * 100;
            const cpuPercent = (data.cpuTimeUsed / data.cpuTimeLimit) * 100;
            const heapPercent = (data.heapSizeUsed / data.heapSizeLimit) * 100;

            const maxPercent = Math.max(soqlPercent, dmlPercent, cpuPercent, heapPercent);

            if (maxPercent >= thresholds.soqlQueries) {
                highUsage.push({
                    ...data,
                    percentages: {
                        soql: soqlPercent.toFixed(1),
                        dml: dmlPercent.toFixed(1),
                        cpu: cpuPercent.toFixed(1),
                        heap: heapPercent.toFixed(1)
                    },
                    maxPercent: maxPercent.toFixed(1)
                });
            }

            // Aggregate by class
            if (!byClass[data.className]) {
                byClass[data.className] = {
                    count: 0,
                    avgSoql: 0,
                    avgDml: 0,
                    avgCpu: 0
                };
            }
            byClass[data.className].count++;
            byClass[data.className].avgSoql += data.soqlQueriesUsed;
            byClass[data.className].avgDml += data.dmlStatementsUsed;
            byClass[data.className].avgCpu += data.cpuTimeUsed;
        }

        // Calculate averages
        for (const className in byClass) {
            const data = byClass[className];
            data.avgSoql = (data.avgSoql / data.count).toFixed(1);
            data.avgDml = (data.avgDml / data.count).toFixed(1);
            data.avgCpu = (data.avgCpu / data.count).toFixed(1);
        }

        return {
            highUsageCount: highUsage.length,
            highUsage,
            byClass
        };
    }
}

export default GovernorLimitMonitor;
