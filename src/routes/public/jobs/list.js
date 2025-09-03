// src/routes/public/jobs/list.js
export default async function listJobs(req, reply) {
	const items = req.server.sched.list().map((j) => ({
		...j,
		nextRunAtIso: new Date(j.nextRunAt * 1000).toISOString(),
	}));
	return items;
}
