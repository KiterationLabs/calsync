// routes/private/calendars/delete.js (ESM)
import { deleteCalendarById } from '../../../../functions/calendar/deleteCalendar.js';

export default async function deleteFunction(req, reply) {
	try {
		const { id } = req.params;
		if (!id) return reply.code(400).send({ error: 'calendar id required' });

		const res = await deleteCalendarById(id, { fallbackUnsubscribe: true });
		return reply.send({ ok: true, action: res.action }); // 'deleted' | 'unsubscribed'
	} catch (err) {
		req.server?.cc?.error?.(err, 'admin.deleteCalendar');
		return reply.code(500).send({ error: 'Delete failed', details: err?.message ?? String(err) });
	}
}
