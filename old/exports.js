// routes/public/jobs/exports.js
import jobsRoutes from './OLDjobs.js';

export default async function publicJobsRoutes(app) {
	await app.register(jobsRoutes, { prefix: '/jobs' });
}
