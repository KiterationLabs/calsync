// src/routes/public/jobs/getById.js
export default async function getJobById(req, reply) {
	const s = req.server.sched.state.schedules[req.params.id];
	if (!s) return reply.code(404).send({ error: 'not_found' });
	return { ...s, nextRunAtIso: new Date(s.nextRunAt * 1000).toISOString() };
}
