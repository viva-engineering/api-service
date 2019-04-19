
import { server } from '../../../server';
import { authenticate } from '../../../middlewares/authenticate';
import { queryParser } from '@celeri/query-parser';
import { validateSearchQuery } from './middlewares';
import { findUsers } from './service';

server
	.get('/user')
	.use(authenticate({ required: true }))
	.use(queryParser())
	.use(validateSearchQuery)
	.use(async ({ req, res }) => {
		const users = await findUsers(req.query, req.user);
		const payload = JSON.stringify(users);

		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(payload);
	});
