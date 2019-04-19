
import { HttpError } from '@celeri/http-error';
import { MiddlewareInput } from '@celeri/http-server';

export interface AuthorizeParams {
	requireModerator?: true;
	requireAdmin?: true;
}

export const authorize = (params: AuthorizeParams) => {
	const isAuthorized = params.requireAdmin
		? (req: MiddlewareInput['req']) => req.user && req.user.isAdmin
		: params.requireModerator
			? (req: MiddlewareInput['req']) => req.user && (req.user.isAdmin || req.user.isModerator)
			: (req: MiddlewareInput['req']) => true;

	return ({ req, res }: MiddlewareInput) => {
		if (! isAuthorized(req)) {
			throw new HttpError(403, 'Not authorized');
		}
	};
};
