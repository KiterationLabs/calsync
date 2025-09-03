// src/routes/public/jobs/setEnabled.js
export default async function setJobEnabled(req, reply) {
	const { id } = req.params;
	const { enabled } = req.body ?? {};
	if (typeof enabled !== 'boolean') {
		return reply.code(400).send({ error: 'enabled boolean required' });
	}

	const s = req.server.sched.state.schedules[id];
	if (!s) return reply.code(404).send({ error: 'not_found' });

	req.server.sched.setEnabled(id, enabled);
	const updated = req.server.sched.state.schedules[id];
	return {
		ok: true,
		enabled: updated.enabled,
		nextRunAt: updated.nextRunAt,
		nextRunAtIso: new Date(updated.nextRunAt * 1000).toISOString(),
	};
}
