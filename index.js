#!/usr/bin/env node

import dotenv from 'dotenv';
import MonitoringOrchestrator from './src/orchestrator.js';
import Scheduler from './src/scheduler.js';
import logger from './src/utils/logger.js';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const runOnce = args.includes('--run-once');

async function main() {
    const orchestrator = new MonitoringOrchestrator();

    try {
        // Initialize services
        await orchestrator.initialize();

        if (runOnce) {
            // Run once and exit
            logger.info('Running in one-shot mode');
            await orchestrator.run();
            orchestrator.cleanup();
            process.exit(0);
        } else {
            // Start scheduler for continuous monitoring
            const scheduler = new Scheduler(orchestrator);
            scheduler.start();

            // Also run immediately on startup
            logger.info('Running initial monitoring check...');
            await orchestrator.run();

            // Handle graceful shutdown
            process.on('SIGINT', () => {
                logger.info('\nShutting down gracefully...');
                scheduler.stop();
                orchestrator.cleanup();
                process.exit(0);
            });

            process.on('SIGTERM', () => {
                logger.info('Received SIGTERM, shutting down...');
                scheduler.stop();
                orchestrator.cleanup();
                process.exit(0);
            });
        }
    } catch (error) {
        logger.error('Fatal error', { error: error.message, stack: error.stack });
        orchestrator.cleanup();
        process.exit(1);
    }
}

// Start the application
main();
