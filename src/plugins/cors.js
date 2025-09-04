import cors from '@fastify/cors';

export default async function registerCors(app) {
	await app.register(cors, {
		origin: true,
		methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
		credentials: true,
	});
}
