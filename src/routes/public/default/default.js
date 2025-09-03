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

		// ---- If calendar already exists: ensure a recurring schedule and return links
		const existingCal = await findCalendarBySummary(resourceId);
		if (existingCal) {
			// Idempotently ensure a background refresh job exists
			if (!req.server.sched.state.schedules[scheduleId]) {
				req.server.sched.upsert({
					id: scheduleId,
					type: 'kronox-sync',
					payload: { sourceUrl: URL, makePublic: true },
					intervalMin: 15,
					enabled: true,
				});
			}
			// Optional: nudge a refresh right away
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

		// ---- First-time setup: create calendar + import now (synchronous)
		const icsFilePath = `./ics/${resourceId}.ics`;
		const jsonOutPath = `./out/${resourceId}.json`;

		const { path, bytes } = await downloadIcs(icsUrl, icsFilePath);
		req.server.log.info({ bytes, path }, 'ICS downloaded');

		await icsToGcalJsonFile(icsFilePath, jsonOutPath, { pretty: true });

		// Sanity/auth
		const cal = await getCalendarClient();
		await cal.calendars.get({ calendarId: process.env.CALENDAR_ID });

		// Ensure dedicated calendar (public)
		const calendar = await ensureCalendarBySummary({
			summary: resourceId,
			description: `Auto-sync for ${resourceId}`,
			makePublic: true,
			publicRole: 'reader',
			updateIfDifferent: false,
		});

		// Import/upsert events (your function handles throttling/backoff)
		const report = await upsertEventsFromJsonFile(calendar.id, jsonOutPath, {
			dryRun: false,
			concurrency: 1,
			throttleMs: 1000,
			baseDelayMs: 1500,
			maxAttempts: 10,
		});

		// ---- After initial import, create the recurring 15-min schedule
		req.server.sched.upsert({
			id: scheduleId,
			type: 'kronox-sync',
			payload: { sourceUrl: URL, makePublic: true },
			intervalMin: 15,
			enabled: true,
		});
		// Next run is aligned by the scheduler; if you want it sooner:
		const s = req.server.sched.state.schedules[scheduleId];
		if (s) s.nextRunAt = nowSec();

		const links = buildCalendarLinks(calendar.id);

		timer({ status: 'success' });
		return reply.send({
			status: 'created_and_synced',
			calendarId: calendar.id,
			summary: calendar.summary,
			report,
			nextRunAt: s?.nextRunAt ?? null,
			links,
		});
	} catch (err) {
		req.server.log.error({ err }, 'kronox endpoint failed');
		timer({ status: 'fail' });
		return reply.code(500).send({
			error: 'Internal error',
			details: err?.response?.data ?? err?.message ?? String(err),
		});
	}
}
