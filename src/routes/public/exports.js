import defaultFunction from './default/default.js';

// /public prefix is applied by parent
export default async function publicRoutes(app) {
	app.post('/calsync', defaultFunction);
}
