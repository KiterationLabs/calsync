import { loginCounter, loginDuration } from '../../../plugins/customMetrics.js';

import parseURL from '../../../../functions/get-ics.js';
import 'dotenv/config';
import downloadIcs from '../../../../functions/download-ics.js';
import icsToGcalJsonFile from '../../../../functions/parse.js';
import { getCalendarClient } from '../../../../functions/calendar/calendarAPI.js';
import { ensureCalendarBySummary } from '../../../../functions/calendar/ensureCalendarBySummary.js';
import { upsertEventsFromJsonFile } from '../../../../functions/calendar/upsertEventsFromFile.js';
import { findCalendarBySummary } from '../../../../functions/calendar/findCalendarBySummary.js';
import { buildCalendarLinks } from '../../../../functions/calendar/buildCalendarLinks.js';

export default async function defaultFunction(req, reply) {
	const timer = loginDuration.startTimer();
	loginCounter.inc();

	try {
		const { URL } = req.body;
		if (!URL) {
			timer({ status: 'fail' });
			return reply.code(400).send({ error: 'URL required' });
		}

		const { icsUrl, resourceId } = parseURL(URL);
		if (!icsUrl || !resourceId) {
			timer({ status: 'fail' });
			return reply.code(400).send({ error: 'Could not parse URL into an ICS link/resourceId' });
		}

		// 1) Quick existence check by calendar *name* (resourceId)
		const existingCal = await findCalendarBySummary(resourceId);
		if (existingCal) {
			const links = buildCalendarLinks(existingCal.id);
			// Fast path: no sync — just return the links
			timer({ status: 'success' });
			return reply.send({
				status: 'exists',
				calendarId: existingCal.id,
				summary: existingCal.summary,
				links, // clickable
			});
		}

		// 2) Not found → run full flow (download, convert, create, upsert)
		const icsFilePath = `./ics/${resourceId}.ics`;
		const jsonOutPath = `./out/${resourceId}.json`;

		const { path, bytes } = await downloadIcs(icsUrl, icsFilePath);
		console.log(`Saved ${bytes} bytes to ${path}`);

		await icsToGcalJsonFile(icsFilePath, jsonOutPath, { pretty: true });

		// Ensure auth works
		const cal = await getCalendarClient();
		await cal.calendars.get({ calendarId: process.env.CALENDAR_ID });
		console.log('Auth OK and calendar reachable');

		// Ensure calendar exists (created if missing), make it public so links/ICS work
		const calendar = await ensureCalendarBySummary({
			summary: resourceId,
			description: `Auto-sync for ${resourceId}`,
			makePublic: true,
			publicRole: 'reader',
			updateIfDifferent: false,
		});
		console.log('Using calendar:', calendar.id, '-', calendar.summary);

		// Upsert events
		const report = await upsertEventsFromJsonFile(calendar.id, jsonOutPath, {
			dryRun: false,
			concurrency: 1,
			throttleMs: 1000,
			baseDelayMs: 1500,
			maxAttempts: 10,
		});
		console.log('Done:', report);

		const links = buildCalendarLinks(calendar.id);

		timer({ status: 'success' });
		return reply.send({
			status: 'created_and_synced',
			calendarId: calendar.id,
			summary: calendar.summary,
			report,
			links,
		});
	} catch (err) {
		console.error(err);
		timer({ status: 'fail' });
		return reply.code(500).send({
			error: 'Internal error',
			details: err?.response?.data ?? err?.message ?? String(err),
		});
	}
}
