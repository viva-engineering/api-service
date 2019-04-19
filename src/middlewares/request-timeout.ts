
import { MiddlewareInput } from '@celeri/http-server';
import { MiddlewareFunction } from '@celeri/middleware-pipeline';
import { isShuttingDown } from '@viva-eng/cluster';
import { HttpError } from '@celeri/http-error';
import { errorHandler } from './error-handler';

/**
 * Sets the request timeout duration. If the request has not finished when the timeout is
 * exceeded, an error is sent to the client
 *
 * @param timeout The timeout duration in milliseconds
 */
export const requestTimeout = (timeout: number) : MiddlewareFunction<MiddlewareInput> => {
	return ({ req, res }) => {
		let requestFinished = false;

		req.on('end', () => {
			requestFinished = true;
		});

		const onTimeout = () => {
			if (! res.headersSent) {
				const statusCode = requestFinished ? 504 : 408;
				const error = new HttpError(statusCode, 'Connection timed out') as any as Error;

				errorHandler({ req, res, error });
			}
		};

		const timer = setTimeout(onTimeout, timeout);

		// Prevent node's default timeout handling from kicking in
		req.socket.removeAllListeners('timeout');
		req.socket.setTimeout(0);

		res.once('prefinish', () => {
			clearTimeout(timer);
		});
	};
};
