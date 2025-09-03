// src/routes/public/jobs/delete.js
export default async function deleteJob(req, reply) {
	const { id } = req.params;
	if (!req.server.sched.state.schedules[id]) {
		return reply.code(404).send({ error: 'not_found' });
	}
	req.server.sched.remove(id);
	return { ok: true };
}
