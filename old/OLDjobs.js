// src/routes/public/jobs/jobs.js
export default async function jobsRoutes(app) {
	const sched = app.sched; // from app.decorate('sched', ...)

	app.get(
		'/',
		{
			schema: {
				response: {
					200: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								type: { type: 'string' },
								intervalMin: { type: 'integer' },
								enabled: { type: 'boolean' },
								nextRunAt: { type: 'integer' }, // unix seconds
								payload: { type: 'object' },
							},
							required: ['id', 'type', 'intervalMin', 'enabled', 'nextRunAt'],
						},
					},
				},
			},
		},
		async (req, reply) => {
			return sched.list();
		}
	);

	app.get('/:id', async (req, reply) => {
		const s = sched.state.schedules[req.params.id];
		if (!s) return reply.code(404).send({ error: 'not_found' });
		return s;
	});

	app.post(
		'/',
		{
			schema: {
				body: {
					type: 'object',
					required: ['id', 'type', 'payload'],
					properties: {
						id: { type: 'string' },
						type: { type: 'string' },
						payload: { type: 'object' },
						intervalMin: { type: 'integer', default: 15 },
						enabled: { type: 'boolean', default: true },
					},
				},
			},
		},
		async (req, reply) => {
			try {
				sched.upsert(req.body);
				const s = sched.state.schedules[req.body.id];
				return reply.code(201).send({ ok: true, nextRunAt: s?.nextRunAt ?? null });
			} catch (e) {
				return reply.code(400).send({ error: e?.message || 'bad_request' });
			}
		}
	);

	app.post(
		'/:id/enable',
		{
			schema: {
				body: {
					type: 'object',
					properties: { enabled: { type: 'boolean' } },
					required: ['enabled'],
				},
			},
		},
		async (req, reply) => {
			if (!sched.state.schedules[req.params.id]) {
				return reply.code(404).send({ error: 'not_found' });
			}
			sched.setEnabled(req.params.id, !!req.body.enabled);
			const s = sched.state.schedules[req.params.id];
			return { ok: true, enabled: s.enabled, nextRunAt: s.nextRunAt };
		}
	);

	app.post('/:id/sync-now', async (req, reply) => {
		const s = sched.state.schedules[req.params.id];
		if (!s) return reply.code(404).send({ error: 'not_found' });
		s.nextRunAt = Math.floor(Date.now() / 1000);
		return { ok: true, nextRunAt: s.nextRunAt };
	});

	app.delete('/:id', async (req, reply) => {
		if (!sched.state.schedules[req.params.id]) {
			return reply.code(404).send({ error: 'not_found' });
		}
		sched.remove(req.params.id);
		return { ok: true };
	});
}
