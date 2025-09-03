import fastifyMetrics from 'fastify-metrics';

export default async function registerMetrics(app) {
	await app.register(fastifyMetrics, {
		endpoint: '/metrics', // Expose Prometheus metrics at /metrics
		defaultMetrics: true, // Collect CPU/memory usage etc.
	});
}
