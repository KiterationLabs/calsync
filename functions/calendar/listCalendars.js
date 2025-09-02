// functions/calendar/listCalendars.js (ESM)
import { getCalendarClient } from './calendarAPI.js';

/**
 * List calendars the authenticated account can see.
 *
 * @param {import('googleapis').calendar_v3.Calendar} [cal]  Optional pre-made client
 * @param {Object} [opts]
 * @param {number}  [opts.pageSize=250]
 * @param {boolean} [opts.showHidden=false]
 * @param {'freeBusyReader'|'reader'|'writer'|'owner'} [opts.minAccessRole]
 * @param {boolean} [opts.simplify=true]  Map to small objects (id, summary, etc.)
 * @returns {Promise<Array>}
 */
export async function listCalendars(
	cal,
	{ pageSize = 250, showHidden = false, minAccessRole, simplify = true } = {}
) {
	const client = cal ?? (await getCalendarClient());

	const all = [];
	let pageToken;
	do {
		const { data } = await client.calendarList.list({
			maxResults: pageSize,
			pageToken,
			showHidden,
			...(minAccessRole ? { minAccessRole } : {}),
		});
		all.push(...(data.items ?? []));
		pageToken = data.nextPageToken;
	} while (pageToken);

	if (!simplify) return all;

	return all.map((c) => ({
		id: c.id,
		summary: c.summary,
		accessRole: c.accessRole,
		primary: Boolean(c.primary),
		selected: Boolean(c.selected),
		timeZone: c.timeZone,
	}));
}

/** Convenience: find the first calendar with an exact summary match. */
export async function findCalendarBySummary(summary, cal, opts) {
	const cals = await listCalendars(cal, { ...(opts ?? {}), simplify: true });
	return cals.find((c) => c.summary === summary) ?? null;
}
