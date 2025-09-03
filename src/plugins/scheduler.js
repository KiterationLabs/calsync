// src/plugins/scheduler.js (ESM)
import fp from 'fastify-plugin';
import { Scheduler, registerHandler } from '../../functions/scheduler.js';
import syncKronox from '../../functions/syncKronox.js';

export default fp(async function registerScheduler(app) {
	// Register job type(s) once
	registerHandler('kronox-sync', async (payload) => {
		app.cc.info(`job start -> ${JSON.stringify(payload)}`, 'SCHED');
		const res = await syncKronox(payload);
		app.cc.success(`job ok -> ${res.resourceId}`, 'SCHED');
		app.cc.debug(res.report, 'SCHED');
	});

	// Create + init + start a single scheduler
	const sched = new Scheduler();
	await sched.init();
	sched.start();

	// expose it to routes
	app.decorate('sched', sched);

	// graceful shutdown
	app.addHook('onClose', async () => {
		sched.stop();
	});
});
