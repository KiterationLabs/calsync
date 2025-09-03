// src/routes/public/jobs/create.js
export default async function createJob(req, reply) {
	const { id, type, payload, intervalMin = 15, enabled = true } = req.body ?? {};
	if (!id || !type || typeof payload !== 'object') {
		return reply.code(400).send({ error: 'id, type, payload required' });
	}

	try {
		req.server.sched.upsert({ id, type, payload, intervalMin, enabled });
		const s = req.server.sched.state.schedules[id];
		return reply.code(201).send({
			ok: true,
			id,
			nextRunAt: s?.nextRunAt ?? null,
			nextRunAtIso: s ? new Date(s.nextRunAt * 1000).toISOString() : null,
		});
	} catch (e) {
		return reply.code(400).send({ error: e?.message || 'bad_request' });
	}
}
