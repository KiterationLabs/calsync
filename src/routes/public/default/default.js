// routes/public/default/default.js
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

const nowSec = () => Math.floor(Date.now() / 1000);

function fireAndForget(promise, log) {
	promise.catch((err) => log?.error?.({ err }, 'bg task failed'));
}

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

		const scheduleId = `kronox:${resourceId}`;

		// If the calendar already exists: schedule + nudge + return quickly
		const existingCal = await findCalendarBySummary(resourceId);
		if (existingCal) {
			if (!req.server.sched.state.schedules[scheduleId]) {
				req.server.sched.upsert({
					id: scheduleId,
					type: 'kronox-sync',
					payload: { sourceUrl: URL, makePublic: true },
					intervalMin: 15,
					enabled: true,
				});
			}
			// nudge it
			const s = req.server.sched.state.schedules[scheduleId];
			if (s) s.nextRunAt = nowSec();

			const links = buildCalendarLinks(existingCal.id);
			timer({ status: 'success' });
			return reply.code(202).send({
				status: 'exists_scheduled_refresh',
				calendarId: existingCal.id,
				summary: existingCal.summary,
				nextRunAt: s?.nextRunAt ?? null,
				links,
			});
		}

		// ---- Calendar missing: create it *fast*, respond, then do the heavy work in background

		// 1) Ensure auth & create calendar quickly
		const cal = await getCalendarClient();
		await cal.calendars.get({ calendarId: process.env.CALENDAR_ID }); // sanity
		const calendar = await ensureCalendarBySummary({
			summary: resourceId,
			description: `Auto-sync for ${resourceId}`,
			makePublic: true,
			publicRole: 'reader',
			updateIfDifferent: false,
		});

		// 2) Return immediately with calendarId + links (202 Accepted)
		const links = buildCalendarLinks(calendar.id);
		const responsePayload = {
			status: 'scheduled_create_and_sync',
			calendarId: calendar.id,
			summary: calendar.summary,
			nextRunAt: nowSec(), // we’ll nudge below
			links,
		};
		timer({ status: 'success' });
		reply.code(202).send(responsePayload);

		// 3) After sending, kick background work (download → parse → upsert) and set recurring schedule
		const bg = (async () => {
			// prepare files
			const icsFilePath = `./ics/${resourceId}.ics`;
			const jsonOutPath = `./out/${resourceId}.json`;

			const { path, bytes } = await downloadIcs(icsUrl, icsFilePath);
			req.server.cc?.debug?.(`ICS saved ${bytes} bytes @ ${path}`, 'BG');

			await icsToGcalJsonFile(icsFilePath, jsonOutPath, { pretty: true });

			const report = await upsertEventsFromJsonFile(calendar.id, jsonOutPath, {
				dryRun: false,
				concurrency: 1,
				throttleMs: 1000,
				baseDelayMs: 1500,
				maxAttempts: 10,
			});
			req.server.cc?.info?.(`initial upsert done -> ${resourceId}`, 'BG');
			req.server.cc?.debug?.(report, 'BG');

			// ensure schedule exists and nudge it (in case it was not created yet)
			if (!req.server.sched.state.schedules[scheduleId]) {
				req.server.sched.upsert({
					id: scheduleId,
					type: 'kronox-sync',
					payload: { sourceUrl: URL, makePublic: true },
					intervalMin: 15,
					enabled: true,
				});
			}
			const s = req.server.sched.state.schedules[scheduleId];
			if (s) s.nextRunAt = nowSec(); // run soon, then every 15 min
		})();

		fireAndForget(bg, req.server.cc);
		// Important: return after reply above; do not `await bg`.
	} catch (err) {
		req.server.cc?.error?.(err?.message || err, 'kronox');
		timer({ status: 'fail' });
		return reply.code(500).send({
			error: 'Internal error',
			details: err?.response?.data ?? err?.message ?? String(err),
		});
	}
}
