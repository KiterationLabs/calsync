// src/routes/public/jobs/syncNow.js
const nowSec = () => Math.floor(Date.now() / 1000);

export default async function syncNow(req, reply) {
	const s = req.server.sched.state.schedules[req.params.id];
	if (!s) return reply.code(404).send({ error: 'not_found' });
	s.nextRunAt = nowSec();
	return {
		ok: true,
		nextRunAt: s.nextRunAt,
		nextRunAtIso: new Date(s.nextRunAt * 1000).toISOString(),
	};
}
