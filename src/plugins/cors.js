import cors from '@fastify/cors';

export default async function registerCors(app) {
	await app.register(cors, {
		origin: true,
		credentials: true,
	});
}
