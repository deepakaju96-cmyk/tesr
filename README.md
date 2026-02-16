# 🚀 Salesforce Apex Monitoring Agent

An autonomous monitoring agent that runs outside of Salesforce to track Apex governor limits, code quality issues, and debug log exceptions. No org changes required!

## Features

✅ **Debug Log Monitoring** - Tracks exceptions and errors from EventLogFile API  
✅ **Governor Limit Tracking** - Monitors SOQL, DML, CPU time, and heap usage  
✅ **Code Quality Analysis** - Checks cyclomatic complexity and best practices  
✅ **Anomaly Detection** - Identifies unusual patterns and threshold violations  
✅ **Email Notifications** - Sends alerts when issues are detected  
✅ **HTML Reports** - Generates detailed monitoring reports  
✅ **Autonomous Operation** - Runs on a schedule without manual intervention  

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your Salesforce credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Salesforce credentials:

```env
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=your-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-security-token

# Email settings (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=developer@example.com
```

### 3. Configure Thresholds

Edit `config.json` to customize monitoring thresholds:

```json
{
  "thresholds": {
    "governorLimits": {
      "soqlQueries": 70,
      "dmlStatements": 70,
      "cpuTime": 70
    },
    "codeQuality": {
      "cyclomaticComplexity": 15,
      "minTestCoverage": 75
    }
  }
}
```

### 4. Run the Agent

**One-time check:**
```bash
npm run monitor
```

**Continuous monitoring (runs every hour):**
```bash
npm start
```

## How It Works

```
┌─────────────────┐
│  Scheduler      │  Runs every hour (configurable)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │  Coordinates all monitors
└────────┬────────┘
         │
         ├──► Debug Log Monitor ────┐
         ├──► Governor Limit Monitor │
         └──► Code Quality Monitor  │
                                     │
                            ┌────────▼────────┐
                            │ Anomaly Detector│
                            └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │   Notifier      │
                            └─────────────────┘
                            Email + HTML Reports
```

## What Gets Monitored

### Debug Logs
- Exception events
- Fatal errors
- DmlExceptions
- QueryExceptions
- Error frequency patterns

### Governor Limits
- SOQL queries (threshold: 70% of limit)
- DML statements (threshold: 70% of limit)
- CPU time (threshold: 70% of limit)
- Heap size (threshold: 70% of limit)

### Code Quality
- Cyclomatic complexity (threshold: >15)
- Class length (threshold: >1000 lines)
- Method length (threshold: >100 lines)
- Test coverage (threshold: <75%)

## Anomaly Severity Levels

- 🔴 **CRITICAL** - Immediate action required (>90% limit usage)
- 🟠 **HIGH** - Needs attention soon (>80% limit usage)  
- 🟡 **MEDIUM** - Should be reviewed (multiple errors, quality issues)
- 🔵 **LOW** - Minor issues (informational)

## Output

### Console Logs
Real-time monitoring progress in the terminal

### HTML Reports
Saved to `./reports/` directory with timestamp

### Email Notifications
Sent when anomalies are detected (configurable)

### SQLite Database
Historical data stored in `./data/monitoring.db`

## Salesforce API Permissions Required

The monitoring agent needs these permissions:

- ✅ API Enabled
- ✅ View Setup and Configuration
- ✅ View All Data (for EventLogFile access)
- ❌ NO modify permissions needed

## Scheduling

Default: Runs every hour (`0 * * * *`)

Customize in `.env`:
```env
# Run every 30 minutes
MONITOR_SCHEDULE=*/30 * * * *

# Run daily at 9 AM
MONITOR_SCHEDULE=0 9 * * *

# Run every 6 hours
MONITOR_SCHEDULE=0 */6 * * *
```

## Deployment Options

### Local Machine
Run as a background process or use PM2:
```bash
npm install -g pm2
pm2 start index.js --name apex-monitor
```

### Docker (Coming Soon)
```bash
docker build -t apex-monitor .
docker run -d apex-monitor
```

### Cloud Platforms
- AWS Lambda (scheduled via EventBridge)
- Google Cloud Functions (scheduled via Cloud Scheduler)
- Heroku (using Heroku Scheduler)

## Troubleshooting

**Authentication fails:**
- Verify SF_USERNAME, SF_PASSWORD, and SF_SECURITY_TOKEN
- Check if IP is whitelisted in Salesforce

**No debug logs found:**
- EventLogFile API requires org to collect debug logs
- Enable Debug Logs in Setup > Debug Logs

**Email not sending:**
- Check SMTP credentials
- For Gmail, use App Password (not regular password)
- Enable "Less secure app access" if needed

## Architecture

```
apex-monitor-agent/
├── src/
│   ├── auth/              # Salesforce authentication
│   ├── monitors/          # Debug logs, governor limits, code quality
│   ├── analyzers/         # Anomaly detection logic
│   ├── notifications/     # Email and report generation
│   ├── storage/           # SQLite database
│   ├── utils/             # Logging and retry utilities
│   ├── orchestrator.js    # Main workflow coordinator
│   └── scheduler.js       # Cron-based scheduling
├── config.json            # Monitoring thresholds
├── .env                   # Credentials (not in git)
└── index.js               # Application entry point
```

## Contributing

Pull requests welcome! Please ensure:
- Code follows ES6+ standards
- Logging uses Winston logger
- Error handling includes retry logic

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
