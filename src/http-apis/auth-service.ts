
import { config } from '../config';
import { logger } from '../logger';
import { HttpClient, TimeoutAbort } from '@viva-eng/http-client';

export const authServiceClient = new HttpClient({
	...config.services.authService,
	logger
});

export interface HealthcheckResult {
	available: boolean;
	url: string;
	duration?: string;
	queued?: string;
	dnsLookup?: string;
	tcpConnection?: string;
	tlsHandshake?: string;
	timeToFirstByte?: string;
	contentDownload?: string;
	warning?: string;
	info?: string;
}

export const healthcheck = async () => {
	const url = `${authServiceClient.ssl ? 'https' : 'http'}://${authServiceClient.hostname}:${authServiceClient.port}`;
	const result: HealthcheckResult = { url, available: true };

	try {
		const res = await authServiceClient.get('/healthcheck', { });

		Object.assign(result, res.timing);

		if (res.timing.wasSlow) {
			result.warning = `Response slower than ${authServiceClient.slowThreshold}ms`;
		}
	}

	catch (error) {
		result.available = false;

		if (error === TimeoutAbort) {
			result.info = 'The healthcheck request timed out';
		}

		else if (error instanceof Error) {
			result.info = 'An error occured while running the healthcheck';

			logger.warn('An error occured while running the healthcheck for auth-service', { error });
		}

		else if (error.statusCode) {
			result.info = `Received an status ${error.statusCode} response from auth-service`;

			if (error.timing) {
				Object.assign(result, error.timing);
			}
		}

		else {
			// WTF?
			logger.error('An unknown, unexpected error occured while running an auth healthcheck', { error });
		}
	}

	return result;
};
