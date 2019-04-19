
import { HttpError } from '@celeri/http-error';
import { MiddlewareInput } from '@celeri/http-server';
import { StringField } from '@viva-eng/payload-validator';

const userCodeRegex = /^[0-9a-zA-Z]{40}$/;

/**
 * Validates that the URL parameter `userCode` is a (syntactically) valid user code
 * and throws an HTTP 404 error if not
 */
export const validateUserCode = ({ req, res }: MiddlewareInput) => {
	if (! userCodeRegex.test(req.params.userCode)) {
		throw new HttpError(404, 'User code does not exist');
	}
};

/**
 * Determines if the currently authenticated user is authorized to edit the profile
 * they are attempting to and throws an HTTP 403 error if not
 */
export const authorize = ({ req, res }: MiddlewareInput) => {
	const isAuthorized = req.user.isAdmin || req.user.isModerator || req.user.userCode === req.params.userCode;

	if (! isAuthorized) {
		throw new HttpError(403, 'Not authorized');
	}
};


export interface SearchUserQueryParams {
	name?: string;
	email?: string;
	phone?: string;
	userCode?: string;
}

const nameField = new StringField({ maxLength: 255 });
const emailField = new EmailField({ });
const phoneField = new StringField({ regex: /^\+?[1-9]\d{1,14}$/ });
const userCodeField = new StringField({ minLength: 40, maxLength: 40 });
