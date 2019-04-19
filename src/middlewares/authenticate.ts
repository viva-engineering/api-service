
import { MiddlewareInput, Request } from '@celeri/http-server';
import { MiddlewareFunction } from '@celeri/middleware-pipeline';
import { HttpError } from '@celeri/http-error';
import { TimeoutAbort } from '@viva-eng/http-client';
import { errorHandler } from './error-handler';
import { authServiceClient } from '../http-apis/auth-service';
import { logger } from '../logger';

const enum AuthErrors {
	NeedsEmailValidation = 'NEEDS_EMAIL_VALIDATION',
	PasswordExpired = 'PASSWORD_EXPIRED'
}

export interface AuthenticatedUser {
	userId: number;
	userCode: string;
	token: string;
	email: string;
	name: string;
	isAdmin?: true;
	isModerator?: true;
}

interface AuthenticateParams {
	required?: true;
}

interface SuccessfulAuthResponse {
	userId: number;
	userCode: string;
	email: string;
	name: string;
	needsEmailValidation?: true;
	passwordExpired?: true;
}

export const authenticate = (params: AuthenticateParams = { }) : MiddlewareFunction<MiddlewareInput> => {
	return async ({ req, res }) => {
		const sessionToken = getToken(req.headers['x-user-token'], params.required);

		if (sessionToken) {
			let body: SuccessfulAuthResponse;

			try {
				const res = await authServiceClient.get('/session', {
					headers: {
						'x-user-token': sessionToken
					}
				});

				body = res.json;
			}

			catch (error) {
				// If the auth service sent us a 401, pass the message along
				if (error.statusCode === 401) {
					throw new HttpError(401, error.json.message, error.json.meta);
				}

				if (error === TimeoutAbort) {
					logger.warn('Timed out attempting to validate a user token');
				}

				throw new HttpError(500, 'An unexpected error occured while attempting to process the request');
			}

			if (body.needsEmailValidation) {
				throw new HttpError(403, 'Not allowed to take that action at this time', {
					code: AuthErrors.NeedsEmailValidation
				});
			}

			if (body.passwordExpired) {
				throw new HttpError(403, 'Not allowed to take that action at this time', {
					code: AuthErrors.PasswordExpired
				});
			}

			req.user = {
				userId: body.userId,
				userCode: body.userCode,
				email: body.email,
				name: body.name,
				token: sessionToken
			};
		}
	};
};

const getToken = (token: string | string[], required: boolean) : string => {
	if (required && ! token) {
		throw new HttpError(401, 'Authentication required');
	}

	if (Array.isArray(token)) {
		if (token.length > 1) {
			throw new HttpError(400, 'Received multiple session token headers');
		}

		return token[0];
	}

	return token;
};

declare module '@celeri/http-server' {
	interface Request {
		user?: AuthenticatedUser;
	}
}
