
import { server } from '../../server';
import { isShuttingDown } from '@viva-eng/cluster';

server
	.get('/user/find-by-email')
	.use(({ req, res }) => {
		const shuttingDown = isShuttingDown();
		const statusCode = shuttingDown ? 503 : 200;

		res.writeHead(statusCode, { 'content-type': 'application/json' });
		
		res.end(JSON.stringify({
			status: shuttingDown ? 'shutting down' : 'available'
		}));
	});

