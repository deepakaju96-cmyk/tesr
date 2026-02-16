import logger from './logger.js';

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} Result of the function
 */
export async function retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const backoffDelay = delay * Math.pow(2, attempt - 1);
                logger.warn(`Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`, {
                    error: error.message
                });
                await sleep(backoffDelay);
            }
        }
    }

    logger.error(`All ${maxRetries} attempts failed`, { error: lastError.message });
    throw lastError;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
