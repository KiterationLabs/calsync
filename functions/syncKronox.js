// handlers/syncKronox.js (ESM)
import parseURL from '../functions/get-ics.js';
import downloadIcs from '../functions/download-ics.js';
import icsToGcalJsonFile from '../functions/parse.js';
import { getCalendarClient } from '../functions/calendar/calendarAPI.js';
import { ensureCalendarBySummary } from '../functions/calendar/ensureCalendarBySummary.js';
import { upsertEventsFromJsonFile } from '../functions/calendar/upsertEventsFromFile.js';
import path from 'node:path';

export default async function syncKronox({ sourceUrl, makePublic = true }) {
	// 1) Kronox → ICS URL
	const { icsUrl, resourceId } = parseURL(sourceUrl);

	// 2) Download ICS
	const icsFilePath = path.resolve('./ics', `${resourceId}.ics`);
	const outJsonPath = path.resolve('./out', `${resourceId}.json`);
	const { path: savedPath } = await downloadIcs(icsUrl, icsFilePath);

	// 3) Convert ICS → Google-shape events
	await icsToGcalJsonFile(savedPath, outJsonPath, { pretty: true });

	// 4) Ensure calendar exists (direct Google API calls, no wrapper)
	const cal = await getCalendarClient();
	await cal.calendars.get({ calendarId: process.env.CALENDAR_ID }); // sanity/auth

	const calendar = await ensureCalendarBySummary({
		summary: resourceId,
		description: `Auto-sync for ${resourceId}`,
		makePublic,
		publicRole: 'reader',
		updateIfDifferent: false,
		// no googleCall
	});

	// 5) Upsert events (this already has throttle+retry)
	const report = await upsertEventsFromJsonFile(calendar.id, outJsonPath, {
		dryRun: false,
		concurrency: 1, // keep this at 1 to avoid Calendar write bursts
		throttleMs: 1000, // ~1 req/sec is safe for inserts/patches
		baseDelayMs: 1500,
		maxAttempts: 10,
	});

	return { calendarId: calendar.id, resourceId, report };
}
