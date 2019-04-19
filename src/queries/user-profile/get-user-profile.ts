
import { SelectQueryResult } from '@viva-eng/database';
import { SelectQuery, tables, Bit, PrivacyFlag } from '@viva-eng/viva-database';
import { MysqlError, format } from 'mysql';
import { AuthenticatedUser } from '../../middlewares/authenticate';

export interface GetUserProfileRecord {
	user_code: string;
	email: string;
	name: string;
	phone: string;
	location: string;
	birthday: string;
	contains_explicit_content: Bit;
	is_admin: Bit;
	is_moderator: Bit;
	email_privacy: PrivacyFlag;
	phone_privacy: PrivacyFlag;
	location_privacy: PrivacyFlag;
	birthday_privacy: PrivacyFlag;
	is_self: boolean;
	is_friend: boolean;
	default_post_privacy: PrivacyFlag;
	default_image_privacy: PrivacyFlag;
	discoverable_by_email: Bit;
	discoverable_by_name: Bit;
	discoverable_by_phone: Bit;
}

export interface GetUserProfileParams {
	userCode: string;
	searchAs: AuthenticatedUser;
}

const user = tables.users.columns;
const friend = tables.friends.columns;
const priv = tables.privacySettings.columns;

/**
 * Query that searches for a user by friend code. Is bound to the searching user to only
 * return results the user should be allowed to see
 */
class GetUserProfileQuery extends SelectQuery<GetUserProfileParams, GetUserProfileRecord> {
	public readonly template = `select ... from ${tables.users.name} where ${user.email} = ?`;
	private readonly prepared: string;

	constructor() {
		super();

		const fields = `
			user.${user.userCode} as user_code,
			user.${user.email} as email,
			priv.${priv.emailPrivacy} as email_privacy,
			user.${user.name} as name,
			user.${user.phone} as phone,
			priv.${priv.phonePrivacy} as phone_privacy,
			user.${user.location} as location,
			priv.${priv.locationPrivacy} as location_privacy,
			user.${user.birthday} as birthday,
			priv.${priv.birthdayPrivacy} as birthday_privacy,
			user.${user.containsExplicitContent} as contains_explicit_content,
			user.${user.isAdmin} as is_admin,
			user.${user.isModerator} as is_moderator,
			(user.${user.id} = ?) as is_self,
			(friend.${friend.userA} is not null and friend.${friend.userB} is not null) as is_friend,
			priv.${priv.defaultPostPrivacy} as default_post_privacy,
			priv.${priv.defaultImagePrivacy} as default_image_privacy,
			priv.${priv.discoverableByEmail} as discoverable_by_email,
			priv.${priv.discoverableByName} as discoverable_by_name,
			priv.${priv.discoverableByPhone} as discoverable_by_phone
		`;

		this.prepared = `
			select ${fields}
			from ${tables.users.name} user
			left outer join ${tables.privacySettings.name} priv
				on priv.${priv.id} = user.${user.privacySettingsId}
			left outer join ${tables.friends.name} friend
				on (friend.${friend.userA} = user.${user.id} and friend.${friend.userB} = ?)
				or (friend.${friend.userB} = user.${user.id} and friend.${friend.userA} = ?)
			where user.${user.userCode} = ?
				and user.${user.active} = 1
		`;
	}

	compile({ userCode, searchAs }: GetUserProfileParams) : string {
		return format(this.prepared, [
			// Check for self
			searchAs.userId,
			// Join on friends table to check if friends
			searchAs.userId,
			searchAs.userId,
			// The user being searched for
			userCode
		]);
	}

	isRetryable(error: MysqlError) : boolean {
		return false;
	}
}

export const getUserProfile = new GetUserProfileQuery();
