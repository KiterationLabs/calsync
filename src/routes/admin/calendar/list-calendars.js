// routes/private/calendars/list.js (ESM)
import { listCalendars as list } from '../../../../functions/calendar/listCalendars.js';

const validRoles = new Set(['freeBusyReader', 'reader', 'writer', 'owner']);

export default async function listFunction(req, reply) {
	try {
		const search = (req.query.search ?? '').toString().trim();
		const showHidden = String(req.query.showHidden ?? 'false') === 'true';
		const minAccessRole =
			req.query.minAccessRole && validRoles.has(req.query.minAccessRole)
				? req.query.minAccessRole
				: undefined;

		const calendars = await list(undefined, {
			pageSize: 250,
			showHidden,
			minAccessRole,
			simplify: true,
		});

		const filtered = search
			? calendars.filter((c) =>
					`${c.summary} ${c.id} ${c.timeZone ?? ''}`.toLowerCase().includes(search.toLowerCase())
			  )
			: calendars;

		return reply.send({ count: filtered.length, calendars: filtered });
	} catch (err) {
		req.server.cc?.error?.(err?.message || err, 'admin-calendars-list');
		return reply.code(500).send({ error: 'Failed to list calendars' });
	}
}
