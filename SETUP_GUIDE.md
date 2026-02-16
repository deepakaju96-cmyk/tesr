# Salesforce Setup Guide

This guide walks you through setting up Salesforce API access for the monitoring agent.

## Step 1: Create a Connected App (Recommended for Production)

1. In Salesforce Setup, search for **App Manager**
2. Click **New Connected App**
3. Fill in basic information:
   - **Connected App Name**: Apex Monitoring Agent
   - **API Name**: Apex_Monitoring_Agent
   - **Contact Email**: your-email@example.com

4. Enable OAuth Settings:
   - ✅ Check "Enable OAuth Settings"
   - **Callback URL**: `http://localhost:3000/oauth/callback`
   - **Selected OAuth Scopes**:
     - Full access (full)
     - Perform requests at any time (refresh_token, offline_access)
   - Click **Save**

5. After saving, retrieve:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret)

## Step 2: Username/Password Authentication (Simpler)

For quick setup, you can use username/password authentication:

1. Get your Security Token:
   - Go to **Personal Settings** > **Reset My Security Token**
   - Click **Reset Security Token**
   - Check your email for the new token

2. Add to `.env`:
   ```env
   SF_LOGIN_URL=https://login.salesforce.com
   SF_USERNAME=your-username@example.com
   SF_PASSWORD=your-password
   SF_SECURITY_TOKEN=your-security-token
   ```

   **Note:** For sandbox, use `https://test.salesforce.com`

## Step 3: Enable API Access

Ensure your user profile has API access:

1. Go to **Setup** > **Users** > **Profiles**
2. Find your profile (e.g., System Administrator)
3. Verify these permissions:
   - ✅ API Enabled
   - ✅ View Setup and Configuration
   - ✅ View All Data

## Step 4: Enable EventLogFile Access

EventLogFile requires special permissions:

1. Go to **Setup** > **Event Monitoring**
2. Ensure Event Log File is enabled for your org
3. Your user must have:
   - ✅ View All Data permission
   - ✅ API Enabled permission

**Note:** EventLogFile is available in:
- Enterprise Edition (with Shield)
- Performance Edition
- Unlimited Edition
- Developer Edition (limited data)

## Step 5: Configure Email Notifications (Optional)

### Gmail Setup:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account > Security
   - Select "App passwords"
   - Generate a new app password
   - Use this password in `.env` as `SMTP_PASS`

### Other Email Providers:

```env
# Office 365
SMTP_HOST=smtp.office365.com
SMTP_PORT=587

# Outlook
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# Custom SMTP
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
```

## Step 6: Test Connection

Run a one-time check to verify everything works:

```bash
npm run monitor
```

Check the logs for:
- ✅ "Successfully authenticated to Salesforce"
- ✅ "Starting debug log monitoring..."
- ✅ "Governor limit monitoring complete"

## Troubleshooting

### "INVALID_LOGIN: Invalid username, password, security token"
- Double-check credentials in `.env`
- Verify security token is appended to password
- For sandbox, use `https://test.salesforce.com`

### "API_DISABLED_FOR_ORG"
- API access not enabled for your org
- Contact Salesforce admin to enable API

### "REQUEST_LIMIT_EXCEEDED"
- You've hit API call limits
- Wait 24 hours or increase limits
- Reduce monitoring frequency

### "No debug logs found"
- EventLogFile may not be available in your edition
- Enable debug logging in Setup > Debug Logs
- Wait a few hours for log files to generate

### "INSUFFICIENT_ACCESS"
- Check user permissions
- Ensure "View All Data" is enabled
- Verify API access is granted

## Security Best Practices

1. **Never commit `.env` to git**
   - Already in `.gitignore`
   - Store credentials securely

2. **Use least privilege**
   - Create a dedicated integration user
   - Grant only necessary permissions

3. **Rotate credentials regularly**
   - Update passwords every 90 days
   - Regenerate security tokens periodically

4. **IP Whitelisting**
   - Add your server IP to Trusted IP Ranges
   - In Setup > Network Access

5. **Monitor API Usage**
   - Check API limits regularly
   - In Setup > System Overview

## Next Steps

Once setup is complete:

1. ✅ Test one-time monitoring: `npm run monitor`
2. ✅ Review the HTML report in `./reports/`
3. ✅ Check email notifications (if enabled)
4. ✅ Start continuous monitoring: `npm start`
5. ✅ Set up as a background service (PM2, Docker, etc.)

## Support

For issues specific to Salesforce setup:
- Salesforce documentation: https://developer.salesforce.com/docs
- Trailhead modules on API integration
- Salesforce Developer Forums
