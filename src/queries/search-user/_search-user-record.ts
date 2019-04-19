
import { Bit, PrivacyFlag } from '@viva-eng/viva-database';

export interface SearchUserRecord {
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
}
