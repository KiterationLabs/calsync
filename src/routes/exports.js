import publicRoutes from './public/exports.js';
import adminRoutes from './admin/exports.js';

export default async function registerRoutes(app, opts) {
	await app.register(publicRoutes, { prefix: '/public' });
	await app.register(adminRoutes, { prefix: '/admin' });
}
