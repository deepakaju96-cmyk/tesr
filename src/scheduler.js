import cron from 'node-cron';
import logger from './utils/logger.js';

class Scheduler {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.task = null;
    }

    /**
     * Start scheduled monitoring
     * @param {string} cronExpression - Cron expression for schedule
     */
    start(cronExpression) {
        const schedule = cronExpression || process.env.MONITOR_SCHEDULE || '0 * * * *';

        logger.info('Starting scheduler', { schedule });

        this.task = cron.schedule(schedule, async () => {
            logger.info('Scheduled monitoring triggered');
            await this.orchestrator.run();
        });

        logger.info('Scheduler started successfully');
        logger.info('Agent is now running autonomously. Press Ctrl+C to stop.');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.task) {
            this.task.stop();
            logger.info('Scheduler stopped');
        }
    }
}

export default Scheduler;
