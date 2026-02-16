import jsforce from 'jsforce';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { retry } from '../utils/retry.js';

dotenv.config();

class SalesforceAuth {
    constructor() {
        this.conn = null;
    }

    /**
     * Authenticate to Salesforce using username/password
     * @returns {Promise<jsforce.Connection>} Authenticated connection
     */
    async authenticate() {
        try {
            const conn = new jsforce.Connection({
                loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
            });

            logger.info('Authenticating to Salesforce...');

            await retry(async () => {
                await conn.login(
                    process.env.SF_USERNAME,
                    process.env.SF_PASSWORD + (process.env.SF_SECURITY_TOKEN || '')
                );
            });

            logger.info('Successfully authenticated to Salesforce', {
                instanceUrl: conn.instanceUrl,
                organizationId: conn.userInfo.organizationId
            });

            this.conn = conn;
            return conn;
        } catch (error) {
            logger.error('Failed to authenticate to Salesforce', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get the current authenticated connection
     * @returns {jsforce.Connection}
     */
    getConnection() {
        if (!this.conn) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }
        return this.conn;
    }

    /**
     * Check if authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.conn !== null;
    }
}

export default new SalesforceAuth();
