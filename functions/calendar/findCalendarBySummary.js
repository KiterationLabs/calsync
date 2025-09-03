// ESM
import { getCalendarClient } from './calendarAPI.js';

export async function findCalendarBySummary(summary) {
	if (!summary) return null;
	const cal = await getCalendarClient();
	const needle = summary.trim().toLowerCase();

	let pageToken;
	do {
		const { data } = await cal.calendarList.list({ maxResults: 250, pageToken });
		const match = (data.items ?? []).find((c) => (c.summary || '').trim().toLowerCase() === needle);
		if (match) {
			// Return full calendar resource
			const { data: calendar } = await cal.calendars.get({ calendarId: match.id });
			return calendar;
		}
		pageToken = data.nextPageToken;
	} while (pageToken);

	return null;
}
