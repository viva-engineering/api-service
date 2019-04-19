
import { logger } from '../../../logger';
import { HttpError } from '@celeri/http-error';
import { TransactionType } from '@viva-eng/database';
import { db, PrivacyFlag } from '@viva-eng/viva-database';
import { SearchUserQueryParams } from './validate';
import { AuthenticatedUser } from '../../../middlewares/authenticate';
import {
	searchUserByEmail,
	searchUserByPhone,
	searchUserByName,
	searchUserByUserCode,
	SearchUserRecord
} from '../../../queries/search-user';

export interface FindUserResult {
	userCode: string;
	name: string;
	email?: string;
	phone?: string;
	location?: string;
	birthday?: string;
	containsExplicitContent?: true;
	isAdmin?: true;
	isModerator?: true;
	isFriend?: true;
	isSelf?: true;
}

/**
 * Performs a search for users matching the given criteria
 */
export const findUsers = async (query: SearchUserQueryParams, searchAs: AuthenticatedUser) : Promise<FindUserResult[]> => {
	try {
		let records: SearchUserRecord[];

		if (query.email) {
			records = await searchUserByEmail.run({
				email: query.email,
				searchAs: searchAs
			});
		}

		else if (query.name) {
			records = await searchUserByName.run({
				name: query.name,
				searchAs: searchAs
			});
		}

		else if (query.phone) {
			records = await searchUserByPhone.run({
				phone: query.phone,
				searchAs: searchAs
			});
		}

		else if (query.userCode) {
			records = await searchUserByUserCode.run({
				userCode: query.userCode,
				searchAs
			});
		}

		return records.map((record) => {
			const result: FindUserResult = {
				userCode: record.user_code,
				name: record.name
			};

			// Minimum needed visibility level needed to view a piece of data
			const neededVisibility = (record.is_self || searchAs.isAdmin || searchAs.isModerator)
				? PrivacyFlag.Private
				: record.is_friend
					? PrivacyFlag.FriendsOnly
					: PrivacyFlag.Public;

			if (record.email_privacy >= neededVisibility) {
				result.email = record.email;
			}

			if (record.phone_privacy >= neededVisibility) {
				result.phone = record.phone;
			}

			if (record.birthday_privacy >= neededVisibility) {
				result.birthday = record.birthday;
			}

			if (record.location_privacy >= neededVisibility) {
				result.location = record.location;
			}

			if (record.contains_explicit_content) {
				result.containsExplicitContent = true;
			}

			if (record.is_admin) {
				result.isAdmin = true;
			}

			if (record.is_moderator) {
				result.isModerator = true;
			}

			if (record.is_self) {
				result.isSelf = true;
			}

			if (record.is_friend) {
				result.isFriend = true;
			}

			return result;
		});
	}

	catch (error) {
		if (error instanceof HttpError) {
			throw error;
		}

		logger.warn('An unexpected error occured while trying to search for users', { error });

		throw new HttpError(500, 'Unexpected server error');
	}
};
