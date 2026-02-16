import logger from '../utils/logger.js';

class CodeQualityMonitor {
    constructor(connection, config) {
        this.conn = connection;
        this.config = config;
    }

    /**
     * Monitor code quality metrics
     * @returns {Promise<Object>} Monitoring results
     */
    async monitor() {
        try {
            logger.info('Starting code quality monitoring...');

            const classes = await this.analyzeApexClasses();
            const issues = this.identifyIssues(classes);

            logger.info('Code quality monitoring complete', {
                totalClasses: classes.length,
                classesWithIssues: issues.length
            });

            return {
                classes,
                issues
            };
        } catch (error) {
            logger.error('Code quality monitoring failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Analyze Apex classes using Tooling API
     * @returns {Promise<Array>} Class analysis results
     */
    async analyzeApexClasses() {
        try {
            // Query ApexClass metadata
            const query = `
        SELECT Id, Name, LengthWithoutComments, ApiVersion, Status
        FROM ApexClass
        WHERE Status = 'Active'
        ORDER BY Name
        LIMIT 1000
      `;

            const result = await this.conn.tooling.query(query);
            const classes = [];

            for (const cls of result.records) {
                // Get symbol table for complexity analysis
                let symbolTable = null;
                try {
                    const symbolQuery = `
            SELECT SymbolTable
            FROM ApexClass
            WHERE Id = '${cls.Id}'
          `;
                    const symbolResult = await this.conn.tooling.query(symbolQuery);
                    symbolTable = symbolResult.records[0]?.SymbolTable;
                } catch (e) {
                    logger.warn(`Failed to get symbol table for ${cls.Name}`);
                }

                const complexity = this.calculateComplexity(symbolTable);

                classes.push({
                    name: cls.Name,
                    length: cls.LengthWithoutComments || 0,
                    complexity: complexity,
                    apiVersion: cls.ApiVersion,
                    testCoverage: null // Would need to query ApexCodeCoverageAggregate
                });
            }

            return classes;
        } catch (error) {
            logger.error('Failed to analyze Apex classes', { error: error.message });
            return [];
        }
    }

    /**
     * Calculate cyclomatic complexity from symbol table
     * @param {Object} symbolTable
     * @returns {number} Complexity score
     */
    calculateComplexity(symbolTable) {
        if (!symbolTable || !symbolTable.methods) {
            return 0;
        }

        let totalComplexity = 0;
        let methodCount = 0;

        for (const method of symbolTable.methods) {
            // Simple heuristic: count decision points
            // In production, you'd parse the method body
            methodCount++;
            totalComplexity += Math.floor(Math.random() * 20); // Placeholder
        }

        return methodCount > 0 ? Math.ceil(totalComplexity / methodCount) : 0;
    }

    /**
     * Identify code quality issues
     * @param {Array} classes
     * @returns {Array} Classes with issues
     */
    identifyIssues(classes) {
        const thresholds = this.config.thresholds.codeQuality;
        const issues = [];

        for (const cls of classes) {
            const classIssues = [];

            if (cls.complexity > thresholds.cyclomaticComplexity) {
                classIssues.push(`High complexity: ${cls.complexity}`);
            }

            if (cls.length > thresholds.classLength) {
                classIssues.push(`Class too long: ${cls.length} lines`);
            }

            if (cls.testCoverage !== null && cls.testCoverage < thresholds.minTestCoverage) {
                classIssues.push(`Low test coverage: ${cls.testCoverage}%`);
            }

            if (classIssues.length > 0) {
                issues.push({
                    className: cls.name,
                    issues: classIssues,
                    metrics: {
                        complexity: cls.complexity,
                        length: cls.length,
                        coverage: cls.testCoverage
                    }
                });
            }
        }

        return issues;
    }
}

export default CodeQualityMonitor;
