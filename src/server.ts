
import './database';

import { requestLogger } from '@celeri/request-logger';
import { config } from './config';
import { logger } from './logger';
import { loadEndpoints } from './endpoints';
import { isShuttingDown, addOnShutdown } from '@viva-eng/cluster';
import { errorHandler } from './middlewares/error-handler';
import { createServer, Request, Response, MiddlewareInput } from '@celeri/http-server';
import { HttpError } from '@celeri/http-error';



// Keep track of running requests so we can wait for them all to finish before shutting down

const runningRequests: Set<Request> = new Set();

addOnShutdown(async () => {
	const sleep = () => new Promise((resolve) => setTimeout(resolve, 100));

	logger.verbose('Waiting until all running HTTP requests complete');

	while (runningRequests.size) {
		await sleep();
	}

	logger.verbose('HTTP requests are all complete');
});



// Server

export const server = createServer({
	// 
});

server.server.listen(config.http.port, config.http.address, () => {
	logger.info('HTTP server is listening', {
		port: config.http.port,
		address: config.http.address
	});
});



// Logger

const loggerMiddleware = requestLogger({
	log: (message: string, req: Request, res: Response, duration: string, finished: boolean) => {
		logger.info('Incomming request', {
			method: req.method,
			path: req.pathname,
			status: res.statusCode,
			duration
		});
	}
});

server.use(loggerMiddleware);



// If the log level is turned all the way up, log when new requests start, as well

if (config.logging.logLevel === 'silly') {
	server.use(({ req, res }) => {
		logger.silly('New incomming request starting', {
			method: req.method,
			path: req.url
		});
	});
}



// Shutdown handler

const shutdownMiddleware = ({ req, res }: MiddlewareInput) => {
	// If we're currently shutting down, don't allow any new requests to start
	if (isShuttingDown()) {
		throw new HttpError(503, 'This server instance is currently shutting down. Please try the request again.');
	}

	runningRequests.add(req);
};

server.use(shutdownMiddleware);



// Router

const routerMiddleware = server.router({
	notFound: ({ req, res }) => {
		throw new HttpError(404, 'Not Found');
	}
});

server.use(routerMiddleware);



// Endpoints

loadEndpoints();



// Error handler

server.catch(errorHandler);



// Final request cleanup

const cleanupMiddleware = ({ req, res }: MiddlewareInput) => {
	runningRequests.delete(req);
};

server.use(cleanupMiddleware);
