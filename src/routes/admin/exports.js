import listFunction from './calendar/list-calendars.js';
import deleteFunction from './calendar/delete-calendars.js';

// /admin prefix is applied by parent
export default async function adminRoutes(app) {
	app.get('/list', listFunction);
	app.delete('/:id', deleteFunction);
	app.post('/:id/delete', deleteFunction);
}
