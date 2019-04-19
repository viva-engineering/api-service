
import { SelectQueryResult } from '@viva-eng/database';
import { SelectQuery, tables } from '@viva-eng/viva-database';
import { MysqlError, format } from 'mysql';
import { SearchUserRecord } from './_search-user-record';
import { AuthenticatedUser } from '../../middlewares/authenticate';

export interface SearchUserByNameParams {
	name: string;
	searchAs: AuthenticatedUser;
}

const user = tables.users.columns;
const friend = tables.friends.columns;
const priv = tables.privacySettings.columns;

/**
 * Query that searches for a user by email address. Is bound to the searching user to only
 * return results the user should be allowed to see
 */
class SearchUserByNameQuery extends SelectQuery<SearchUserByNameParams, SearchUserRecord> {
	public readonly template = `select ... from ${tables.users.name} where ${user.name} like '%?%'`;
	private readonly prepared: {
		/** Query used for normal, non-privledged users */
		user: string;
		/** Query used by admins; allows seeing normally invisible users */
		admin: string;
	};

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
			(friend.${friend.userA} is not null and friend.${friend.userB} is not null) as is_friend
		`;

		this.prepared = {
			user: `
				select ${fields}
				from ${tables.users.name} user
				left outer join ${tables.privacySettings.name} priv
					on priv.${priv.id} = user.${user.privacySettingsId}
				left outer join ${tables.friends.name} friend
					on (friend.${friend.userA} = user.${user.id} and friend.${friend.userB} = ?)
					or (friend.${friend.userB} = user.${user.id} and friend.${friend.userA} = ?)
				where user.${user.name} like ?
					and user.${user.active} = 1
					and (
						user.${user.id} = ?
						or priv.${priv.discoverableByName} = 1
						or (friend.${friend.userA} is not null and friend.${friend.userB} is not null)
					)
				limit 100
			`,
			admin: `
				select ${fields}
				from ${tables.users.name} user
				left outer join ${tables.privacySettings.name} priv
					on priv.${priv.id} = user.${user.privacySettingsId}
				left outer join ${tables.friends.name} friend
					on (friend.${friend.userA} = user.${user.id} and friend.${friend.userB} = ?)
					or (friend.${friend.userB} = user.${user.id} and friend.${friend.userA} = ?)
				where user.${user.name} like ?
					and user.${user.active} = 1
				limit 100
			`
		};
	}

	private compileForUser(name: string, userId: number) : string {
		return format(this.prepared.user, [
			// Used to populate the is_self field
			userId,
			// First left join on friends table
			userId,
			// Second left join on friends table
			userId,
			// Where clause setting who we're looking for
			name,
			// Clause in the where to allow users to find themselves
			userId
		]);
	}

	compile({ name, searchAs }: SearchUserByNameParams) : string {
		const nameQuery = `%${name}%`;

		if (searchAs.isAdmin) {
			return format(this.prepared.admin, [ searchAs.userId, nameQuery ]);
		}

		return this.compileForUser(nameQuery, searchAs.userId);
	}

	isRetryable(error: MysqlError) : boolean {
		return false;
	}
}

export const searchUserByName = new SearchUserByNameQuery();
