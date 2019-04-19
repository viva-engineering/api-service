
import { logger } from './logger';
import { config } from './config';
import { init, db } from '@viva-eng/viva-database';
import { addOnShutdown } from '@viva-eng/cluster';
import { PoolConnection } from 'mysql';

logger.verbose('Initializing database pool', {
	master: config.mysql.master.host,
	replica: config.mysql.replica.host
});

init({
	master: config.mysql.master,
	replica: config.mysql.replica,
	logger
});

addOnShutdown(async () => {
	logger.verbose('Closing database pool');

	await db.destroy();
	
	logger.verbose('Database pool closed');
});
