// src/plugins/env.js
import fastifyEnv from '@fastify/env';

const schema = {
	type: 'object',
	required: ['GSA_CLIENT_EMAIL', 'GSA_PRIVATE_KEY', 'CALENDAR_ID'],
	additionalProperties: true,
	properties: {
		PORT: { type: 'number', default: 3000 },
		NODE_ENV: { type: 'string', default: 'development' },
		LOG_LEVEL: { type: 'string', default: 'info' },

		GSA_CLIENT_EMAIL: { type: 'string' },
		GSA_PRIVATE_KEY: { type: 'string' },
		CALENDAR_ID: { type: 'string' },
	},
};

export default async function registerEnv(fastify) {
	await fastify.register(fastifyEnv, {
		schema,
		dotenv: true, // loads .env
		// confKey: 'config', // keep default so it's app.config
	});
}
