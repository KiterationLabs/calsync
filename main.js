import icsToGcalJsonFile from './functions/parse.js';
import parseURL from './functions/get-ics.js';
import downloadIcs from './functions/download-ics.js';
import 'dotenv/config';
import { getCalendarClient } from './functions/calendar/calendarAPI.js';
import { ensureCalendarBySummary } from './functions/calendar/ensureCalendarBySummary.js';
import { upsertEventsFromJsonFile } from './functions/calendar/upsertEventsFromFile.js';
import { deleteCalendarById } from './functions/calendar/deleteCalendar.js';
import { listCalendars } from './functions/calendar/listCalendars.js';

async function main() {
	const myURL =
		'https://schema.mau.se/setup/jsp/Schema.jsp?startDatum=idag&intervallTyp=a&intervallAntal=1&sprak=SV&sokMedAND=true&forklaringar=true&resurser=p.TGIAR25h';

	/*
	const myURL =
		'https://schema.mau.se/setup/jsp/Schema.jsp?startDatum=idag&intervallTyp=a&intervallAntal=1&sokMedAND=false&sprak=SV&resurser=k.MT155A-20252-TS250-%2C';
    */

	const { icsUrl, resourceId } = parseURL(myURL);
	console.log(icsUrl);

	const icsFilePath = './ics/' + resourceId + '.ics';
	const icsOutFilePath = './out/' + resourceId + '.json';

	const { path, bytes } = await downloadIcs(icsUrl, icsFilePath);
	console.log(`Saved ${bytes} bytes to ${path}`);

	await icsToGcalJsonFile(icsFilePath, icsOutFilePath, { pretty: true });

	const cal = await getCalendarClient();
	await cal.calendars.get({ calendarId: process.env.CALENDAR_ID });
	console.log('Auth OK and calendar reachable');

	let calendars = await listCalendars(cal);
	console.table(calendars);

	// Ensure calendar exists (named after resourceId), public read-only, Stockholm TZ
	const calendar = await ensureCalendarBySummary({
		summary: resourceId,
		description: `Auto-sync for ${resourceId}`,
		makePublic: true, // anyone can view
		publicRole: 'reader',
		updateIfDifferent: false, // flip to true if you want to patch TZ/desc on existing
	});

	console.log('Using calendar:', calendar.id, '-', calendar.summary);

	calendars = await listCalendars(cal);
	console.table(calendars);

	const report = await upsertEventsFromJsonFile(calendar.id, `./out/${resourceId}.json`, {
		dryRun: false,
		concurrency: 1,
		throttleMs: 1000, // ~1 write/sec
		baseDelayMs: 1500, // exponential backoff starting here
		maxAttempts: 10,
	});
	console.log('Done:', report);
}

async function delCal() {
	const cal = await getCalendarClient();
	await cal.calendars.get({ calendarId: process.env.CALENDAR_ID });
	console.log('Auth OK and calendar reachable');

	//! DEBUGGING
	const id =
		'eea18001ae5ef290daa73a8716c7f194e1be44a1e6cf839fd147e638239e6794@group.calendar.google.com';

	try {
		const res = await deleteCalendarById(id, { fallbackUnsubscribe: true });
		console.log(`Calendar ${res.action}.`);
	} catch (e) {
		console.error('Delete failed:', e?.response?.data ?? e);
	}
}

await main();
// await delCal();