import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

class Notifier {
    constructor(config) {
        this.config = config;
        this.transporter = null;

        if (config.notifications.email.enabled) {
            this.setupEmailTransporter();
        }
    }

    /**
     * Setup email transporter
     */
    setupEmailTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            logger.info('Email transporter configured');
        } catch (error) {
            logger.error('Failed to setup email transporter', { error: error.message });
        }
    }

    /**
     * Send notifications for detected anomalies
     * @param {Array} anomalies
     * @param {Object} monitoringResults
     */
    async notify(anomalies, monitoringResults) {
        try {
            if (anomalies.length === 0 && this.config.notifications.email.onAnomalyOnly) {
                logger.info('No anomalies detected, skipping notification');
                return;
            }

            // Generate report
            const report = this.generateReport(anomalies, monitoringResults);

            // Save report to file
            if (this.config.notifications.reports.generateHtml) {
                await this.saveReport(report);
            }

            // Send email
            if (this.config.notifications.email.enabled) {
                await this.sendEmail(anomalies, report);
            }

            logger.info('Notifications sent successfully');
        } catch (error) {
            logger.error('Failed to send notifications', { error: error.message });
        }
    }

    /**
     * Generate HTML report
     * @param {Array} anomalies
     * @param {Object} monitoringResults
     * @returns {string} HTML report
     */
    generateReport(anomalies, monitoringResults) {
        const timestamp = new Date().toISOString();

        let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #0070d2; padding-bottom: 10px; }
    h2 { color: #0070d2; margin-top: 30px; }
    .summary { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .anomaly { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .anomaly.CRITICAL { background: #f8d7da; border-color: #dc3545; }
    .anomaly.HIGH { background: #fff3cd; border-color: #fd7e14; }
    .anomaly.MEDIUM { background: #fff3cd; border-color: #ffc107; }
    .anomaly.LOW { background: #d1ecf1; border-color: #17a2b8; }
    .severity { font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; }
    .CRITICAL { background: #dc3545; color: white; }
    .HIGH { background: #fd7e14; color: white; }
    .MEDIUM { background: #ffc107; color: black; }
    .LOW { background: #17a2b8; color: white; }
    .details { background: #f8f9fa; padding: 10px; margin-top: 10px; border-radius: 3px; font-size: 0.9em; }
    .metric { display: inline-block; margin: 10px 20px 0 0; }
    .metric-label { font-weight: bold; color: #666; }
    .metric-value { font-size: 1.2em; color: #0070d2; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Salesforce Apex Monitoring Report</h1>
    <p><strong>Generated:</strong> ${timestamp}</p>
    
    <div class="summary">
      <h2>📊 Summary</h2>
      <div class="metric">
        <div class="metric-label">Anomalies Detected</div>
        <div class="metric-value">${anomalies.length}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Debug Log Errors</div>
        <div class="metric-value">${monitoringResults.debugLogs?.errors?.length || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">High Limit Usage</div>
        <div class="metric-value">${monitoringResults.governorLimits?.analysis?.highUsageCount || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Code Quality Issues</div>
        <div class="metric-value">${monitoringResults.codeQuality?.issues?.length || 0}</div>
      </div>
    </div>
`;

        if (anomalies.length > 0) {
            html += '<h2>⚠️ Detected Anomalies</h2>';
            for (const anomaly of anomalies) {
                html += `
    <div class="anomaly ${anomaly.severity}">
      <div>
        <span class="severity ${anomaly.severity}">${anomaly.severity}</span>
        <strong>${anomaly.type}</strong>
      </div>
      <p>${anomaly.description}</p>
      <div class="details">
        <pre>${JSON.stringify(anomaly.details, null, 2)}</pre>
      </div>
    </div>
`;
            }
        } else {
            html += '<h2>✅ No Anomalies Detected</h2><p>All systems operating normally.</p>';
        }

        html += `
  </div>
</body>
</html>
`;

        return html;
    }

    /**
     * Save report to file
     * @param {string} report
     */
    async saveReport(report) {
        try {
            const outputDir = this.config.notifications.reports.outputDir;
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = path.join(outputDir, `report-${timestamp}.html`);

            fs.writeFileSync(filename, report);
            logger.info('Report saved', { filename });
        } catch (error) {
            logger.error('Failed to save report', { error: error.message });
        }
    }

    /**
     * Send email notification
     * @param {Array} anomalies
     * @param {string} htmlReport
     */
    async sendEmail(anomalies, htmlReport) {
        if (!this.transporter) {
            logger.warn('Email transporter not configured, skipping email');
            return;
        }

        try {
            const subject = anomalies.length > 0
                ? `⚠️ Apex Monitoring Alert: ${anomalies.length} anomaly(ies) detected`
                : `✅ Apex Monitoring Report: All Clear`;

            await this.transporter.sendMail({
                from: process.env.SMTP_USER,
                to: process.env.NOTIFICATION_EMAIL,
                subject,
                html: htmlReport
            });

            logger.info('Email notification sent', { to: process.env.NOTIFICATION_EMAIL });
        } catch (error) {
            logger.error('Failed to send email', { error: error.message });
        }
    }
}

export default Notifier;
