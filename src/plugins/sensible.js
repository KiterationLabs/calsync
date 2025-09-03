import sensible from 'fastify-sensible';

export default async function registerSensible(app) {
	await app.register(sensible);
}
