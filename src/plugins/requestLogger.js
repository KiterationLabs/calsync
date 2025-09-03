import { randomUUID } from 'crypto';

import { requestCounter } from '../plugins/customMetrics.js';

export default async function requestLogger(app) {
	app.addHook('onRequest', async (request) => {
		const requestId = randomUUID().slice(0, 4);
		request.requestId = requestId;
		request.startTime = Date.now();

		app.cc.info(`${request.method} ${request.url}`, requestId);
	});

	app.addHook('preValidation', async (request) => {
		if (process.env.LOG_LEVEL === 'debug') {
			const body = request.body;

			if (body && typeof body === 'object') {
				app.cc.debug(`${JSON.stringify(body, null, 2)}`, request.requestId);
			} else if (body) {
				app.cc.debug(`(raw) ${String(body)}`, request.requestId);
			} else {
				app.cc.debug('No body present', request.requestId);
			}
		}
	});

	app.addHook('onResponse', async (request, reply) => {
		const duration = Date.now() - request.startTime;
		const statusCode = reply.statusCode;
		const userAgent = request.headers['user-agent'] || 'Unknown';

		const level =
			statusCode >= 500
				? 'error'
				: statusCode >= 400
				? 'warn'
				: statusCode >= 300
				? 'debug'
				: 'success';

		app.cc[level](
			`${request.method} ${request.url} → ${statusCode} (${duration}ms)`,
			request.requestId
		);

		// Increment Prometheus counter
		requestCounter.inc({
			method: request.method,
			route: request.routerPath || request.url, // fallback if route isn't matched
			status_code: statusCode,
		});

		if (process.env.LOG_LEVEL === 'debug') {
			app.cc.debug(`User-Agent: ${userAgent}`, request.requestId);
		}
	});
}
