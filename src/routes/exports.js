import publicRoutes from './public/exports.js';
//import privateRoutes from './private/exports.js';

export default async function registerRoutes(app, opts) {
	await app.register(publicRoutes, { prefix: '/public' });
	//await app.register(privateRoutes, { prefix: '/private' });
}
