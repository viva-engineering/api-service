
import { hostname } from 'os';
import { server } from '../server';
import { isShuttingDown } from '@viva-eng/cluster';
import { db } from '../database';

interface Healthcheck {
	status: 'available' | 'shutting down' | 'unavailable',
	hostname: string
}

interface Dependency {
	available: boolean,
	[key: string]: any
}

interface FullHealthcheck extends Healthcheck {
	dependencies: {
		[name: string]: Dependency
	}
}

server
	.get('/healthcheck')
	.use(({ req, res }) => {
		const shuttingDown = isShuttingDown();
		const statusCode = shuttingDown ? 503 : 200;
		const payload: Healthcheck = {
			status: shuttingDown ? 'shutting down' : 'available',
			hostname: hostname()
		};

		res.writeHead(statusCode, { 'content-type': 'application/json' });
		res.end(JSON.stringify(payload));
	});

server
	.get('/healthcheck/full')
	.use(async ({ req, res }) => {
		const shuttingDown = isShuttingDown();

		if (shuttingDown) {
			const payload: Healthcheck = {
				status: 'shutting down',
				hostname: hostname()
			};

			res.writeHead(503, { 'content-type': 'application/json' });
			res.end(JSON.stringify(payload));
		}

		const { master, replica } = await db.healthcheck();

		const dependencies: Dependency[] = [
			master,
			replica
		];

		const available = dependencies.every((dependency) => dependency.available);
		const statusCode = available ? 200 : 503;

		const payload: FullHealthcheck = {
			status: available ? 'available' : 'unavailable',
			hostname: hostname(),
			dependencies: {
				dbMaster: master,
				dbReplica: replica
			}
		};

		res.writeHead(statusCode, { 'content-type': 'application/json' });
		res.end(JSON.stringify(payload));
	});
