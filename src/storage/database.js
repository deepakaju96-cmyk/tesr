import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

class MonitoringDatabase {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Initialize the database and create tables
     */
    initialize() {
        try {
            // Ensure data directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            this.db = new Database(this.dbPath);
            this.createTables();
            logger.info('Database initialized', { path: this.dbPath });
        } catch (error) {
            logger.error('Failed to initialize database', { error: error.message });
            throw error;
        }
    }

    /**
     * Create database tables
     */
    createTables() {
        const schema = `
      CREATE TABLE IF NOT EXISTS monitoring_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        duration_ms INTEGER
      );

      CREATE TABLE IF NOT EXISTS debug_log_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        timestamp DATETIME,
        log_id TEXT,
        error_type TEXT,
        error_message TEXT,
        class_name TEXT,
        method_name TEXT,
        line_number INTEGER,
        FOREIGN KEY (run_id) REFERENCES monitoring_runs(id)
      );

      CREATE TABLE IF NOT EXISTS governor_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        timestamp DATETIME,
        class_name TEXT,
        method_name TEXT,
        soql_queries_used INTEGER,
        soql_queries_limit INTEGER,
        dml_statements_used INTEGER,
        dml_statements_limit INTEGER,
        cpu_time_used INTEGER,
        cpu_time_limit INTEGER,
        heap_size_used INTEGER,
        heap_size_limit INTEGER,
        FOREIGN KEY (run_id) REFERENCES monitoring_runs(id)
      );

      CREATE TABLE IF NOT EXISTS code_quality (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        timestamp DATETIME,
        class_name TEXT,
        cyclomatic_complexity INTEGER,
        class_length INTEGER,
        test_coverage REAL,
        issues TEXT,
        FOREIGN KEY (run_id) REFERENCES monitoring_runs(id)
      );

      CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        anomaly_type TEXT,
        severity TEXT,
        description TEXT,
        details TEXT,
        FOREIGN KEY (run_id) REFERENCES monitoring_runs(id)
      );
    `;

        this.db.exec(schema);
    }

    /**
     * Start a new monitoring run
     * @returns {number} Run ID
     */
    startRun() {
        const stmt = this.db.prepare('INSERT INTO monitoring_runs (status) VALUES (?)');
        const result = stmt.run('running');
        return result.lastInsertRowid;
    }

    /**
     * End a monitoring run
     * @param {number} runId
     * @param {string} status
     * @param {number} durationMs
     */
    endRun(runId, status, durationMs) {
        const stmt = this.db.prepare(
            'UPDATE monitoring_runs SET status = ?, duration_ms = ? WHERE id = ?'
        );
        stmt.run(status, durationMs, runId);
    }

    /**
     * Insert debug log errors
     * @param {number} runId
     * @param {Array} errors
     */
    insertDebugLogErrors(runId, errors) {
        const stmt = this.db.prepare(`
      INSERT INTO debug_log_errors 
      (run_id, timestamp, log_id, error_type, error_message, class_name, method_name, line_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const insertMany = this.db.transaction((errors) => {
            for (const error of errors) {
                stmt.run(
                    runId,
                    error.timestamp,
                    error.logId,
                    error.errorType,
                    error.errorMessage,
                    error.className,
                    error.methodName,
                    error.lineNumber
                );
            }
        });

        insertMany(errors);
    }

    /**
     * Insert governor limit data
     * @param {number} runId
     * @param {Array} limits
     */
    insertGovernorLimits(runId, limits) {
        const stmt = this.db.prepare(`
      INSERT INTO governor_limits 
      (run_id, timestamp, class_name, method_name, soql_queries_used, soql_queries_limit,
       dml_statements_used, dml_statements_limit, cpu_time_used, cpu_time_limit,
       heap_size_used, heap_size_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const insertMany = this.db.transaction((limits) => {
            for (const limit of limits) {
                stmt.run(
                    runId,
                    limit.timestamp,
                    limit.className,
                    limit.methodName,
                    limit.soqlQueriesUsed,
                    limit.soqlQueriesLimit,
                    limit.dmlStatementsUsed,
                    limit.dmlStatementsLimit,
                    limit.cpuTimeUsed,
                    limit.cpuTimeLimit,
                    limit.heapSizeUsed,
                    limit.heapSizeLimit
                );
            }
        });

        insertMany(limits);
    }

    /**
     * Insert anomalies
     * @param {number} runId
     * @param {Array} anomalies
     */
    insertAnomalies(runId, anomalies) {
        const stmt = this.db.prepare(`
      INSERT INTO anomalies (run_id, anomaly_type, severity, description, details)
      VALUES (?, ?, ?, ?, ?)
    `);

        const insertMany = this.db.transaction((anomalies) => {
            for (const anomaly of anomalies) {
                stmt.run(
                    runId,
                    anomaly.type,
                    anomaly.severity,
                    anomaly.description,
                    JSON.stringify(anomaly.details)
                );
            }
        });

        insertMany(anomalies);
    }

    /**
     * Get error count for the last N hours
     * @param {number} hours
     * @returns {number}
     */
    getErrorCountLastHours(hours) {
        const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM debug_log_errors
      WHERE timestamp >= datetime('now', '-${hours} hours')
    `);
        return stmt.get().count;
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            logger.info('Database connection closed');
        }
    }
}

export default MonitoringDatabase;
