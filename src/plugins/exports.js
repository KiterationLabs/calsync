import registerEnv from './env.js';
import registerCors from './cors.js';
import registerSensible from './sensible.js';
import registerHelmet from './helmet.js';
import registerLogger from './logger.js';
import registerRequestLogger from './requestLogger.js';
import registerMetrics from './metrics.js';

export default async function registerPlugins(app) {
	await registerEnv(app); // Enable dotenv
	await registerSensible(app); // Add helpful utilities
	await registerCors(app); // Enable CORS
	await registerHelmet(app); // Apply security headers
	await registerLogger(app); // Apply logger
	await registerRequestLogger(app); // Apply logging for requests
	await registerMetrics(app); // Apply metrics
}
