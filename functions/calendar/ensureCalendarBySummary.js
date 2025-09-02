// ESM
import { getCalendarClient } from './calendarAPI.js';
import { createCalendar } from './createCalendar.js';

/**
 * Find a calendar by its summary; create it if it doesn't exist.
 *
 * @param {Object} opts
 * @param {string} opts.summary                        - The exact calendar name to look for.
 * @param {string} [opts.timeZone='Europe/Stockholm']  - TZ for newly created calendars.
 * @param {string} [opts.description='']               - Description for newly created calendars.
 * @param {boolean} [opts.makePublic=true]             - Make newly created calendars public (reader).
 * @param {'reader'|'freeBusyReader'} [opts.publicRole='reader'] - Public role when creating.
 * @param {boolean} [opts.updateIfDifferent=false]     - If found, patch timeZone/description when different.
 *
 * @returns {Promise<import('googleapis').calendar_v3.Schema$Calendar>} The found or created calendar.
 */
export async function ensureCalendarBySummary({
	summary,
	timeZone = 'Europe/Stockholm',
	description = '',
	makePublic = true,
	publicRole = 'reader',
	updateIfDifferent = false,
} = {}) {
	if (!summary) throw new Error('ensureCalendarBySummary: "summary" is required');

	const cal = await getCalendarClient();
	const needle = summary.trim().toLowerCase();

	// 1) Search through the calendar list (paginated)
	let pageToken;
	let match;
	do {
		const { data } = await cal.calendarList.list({ maxResults: 250, pageToken });
		const items = data.items ?? [];
		match = items.find((c) => (c.summary || '').trim().toLowerCase() === needle);
		pageToken = data.nextPageToken;
	} while (!match && pageToken);

	if (match) {
		// Optionally align TZ/description on the existing calendar
		if (
			updateIfDifferent &&
			(match.timeZone !== timeZone || (description && match.description !== description))
		) {
			await cal.calendars.patch({
				calendarId: match.id,
				requestBody: { timeZone, description },
			});
		}
		// Return the full calendar resource
		const { data: existing } = await cal.calendars.get({ calendarId: match.id });
		return existing;
	}

	// 2) Create a new calendar if none matched
	const created = await createCalendar({
		summary,
		timeZone,
		description,
		makePublic,
		publicRole,
	});
	return created;
}
