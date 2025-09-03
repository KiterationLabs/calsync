import defaultFunction from './default/default.js';
import listJobs from './jobs/list.js';
import getJobById from './jobs/getById.js';
import createJob from './jobs/create.js';
import setJobEnabled from './jobs/setEnabled.js';
import syncNow from './jobs/syncNow.js';
import deleteJob from './jobs/delete.js';

// /public prefix is applied by parent
export default async function publicRoutes(app) {
	app.post('/calsync', defaultFunction);

	// jobs
	app.get('/jobs/list', listJobs);
	app.get('/jobs/:id', getJobById);
	app.post('/jobs', createJob);
	app.post('/jobs/:id/enable', setJobEnabled);
	app.post('/jobs/:id/sync-now', syncNow);
	app.delete('/jobs/:id', deleteJob);
}
