import Fastify from 'fastify';

import registerPlugins from './plugins/exports.js';
import registerRoutes from './routes/exports.js';

const app = Fastify({ logger: false });

// Register core plugins
await registerPlugins(app);

// Register all routes
await app.register(registerRoutes, { prefix: '/api' });

export default app;
