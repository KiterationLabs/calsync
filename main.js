import icsToGcalJsonFile from './functions/parse.js';
import parseURL from './functions/get-ics.js';
import downloadIcs from './functions/download-ics.js';
import 'dotenv/config';
import { getCalendarClient } from './functions/calendar/calendarAPI.js';
import { ensureCalendarBySummary } from './functions/calendar/ensureCalendarBySummary.js';
import { upsertEventsFromJsonFile } from './functions/calendar/upsertEventsFromFile.js';

async function listCalendars(cal) {
	const all = [];
	let pageToken;
	do {
		const { data } = await cal.calendarList.list({ maxResults: 250, pageToken });
		all.push(...(data.items ?? []));
		pageToken = data.nextPageToken;
	} while (pageToken);

	// Return the useful bits
	return all.map((c) => ({
		id: c.id,
		summary: c.summary,
		accessRole: c.accessRole,
		primary: Boolean(c.primary),
		selected: Boolean(c.selected),
		timeZone: c.timeZone,
	}));
}

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
	console.log(calendars);

	// Ensure calendar exists (named after resourceId), public read-only, Stockholm TZ
	const calendar = await ensureCalendarBySummary({
		summary: resourceId,
		description: `Auto-sync for ${resourceId}`,
		makePublic: true, // anyone can view
		publicRole: 'reader',
		updateIfDifferent: false, // flip to true if you want to patch TZ/desc on existing
	});

	console.log('Using calendar:', calendar.id, '-', calendar.summary);

	let newcalendars = await listCalendars(cal);
	console.table(newcalendars);

	const report = await upsertEventsFromJsonFile(calendar.id, `./out/${resourceId}.json`, {
		dryRun: false,
		concurrency: 2, // start low
		throttleMs: 350, // ~3 writes/sec
		maxAttempts: 7,
		baseDelayMs: 600,
	});
	console.log('Done:', report);
}

await main();
