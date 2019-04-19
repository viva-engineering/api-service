
import { logger } from '../../../logger';
import { HttpError } from '@celeri/http-error';
import { TransactionType } from '@viva-eng/database';
import { db, PrivacyFlag } from '@viva-eng/viva-database';
import { AuthenticatedUser } from '../../../middlewares/authenticate';
import { getUserProfile } from '../../../queries/user-profile/get-user-profile';

const magicUserCodeSelf = 'self';

export interface GetUserResult {
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
	privacy?: UserPrivacySettings;
}

interface UserPrivacySettings {
	email: PrivacyFlag;
	phone: PrivacyFlag;
	birthday: PrivacyFlag;
	location: PrivacyFlag;
	post: PrivacyFlag;
	image: PrivacyFlag;
	discoverability: {
		email: 0 | 1;
		name: 0 | 1;
		phone: 0 | 1;
	};
}

/**
 * Fetches a single user profile using the provided user code
 */
export const getUser = async (userCode: string, searchAs: AuthenticatedUser) : Promise<void|GetUserResult> => {
	try {
		if (userCode === magicUserCodeSelf) {
			userCode = searchAs.userCode;
		}

		const record = (await getUserProfile.run({ userCode, searchAs }))[0];

		if (! record) {
			throw new HttpError(404, 'User code does not exist');
		}

		const result: GetUserResult = {
			userCode: record.user_code,
			name: record.name
		};

		const isPriviledged = record.is_self || searchAs.isAdmin || searchAs.isModerator;

		// Minimum needed visibility level needed to view a piece of data
		const neededVisibility = isPriviledged
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

		if (record.is_friend) {
			result.isFriend = true;
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

		if (isPriviledged) {
			result.privacy = {
				email: record.email_privacy,
				phone: record.phone_privacy,
				birthday: record.birthday_privacy,
				location: record.location_privacy,
				post: record.default_post_privacy,
				image: record.default_image_privacy,
				discoverability: {
					email: record.discoverable_by_email,
					phone: record.discoverable_by_phone,
					name: record.discoverable_by_name
				}
			};
		}

		return result;
	}

	catch (error) {
		if (error instanceof HttpError) {
			throw error;
		}

		logger.warn('An unexpected error occured while trying to search for users', { error });

		throw new HttpError(500, 'Unexpected server error');
	}
};
