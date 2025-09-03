// ESM
export function buildCalendarLinks(calendarId) {
	const enc = encodeURIComponent(calendarId);
	return {
		addToGoogle: `https://calendar.google.com/calendar/u/0/r?cid=${enc}`, // “Add” link
		embedHtml: `https://calendar.google.com/calendar/embed?src=${enc}`, // View/embed
		publicIcs: `https://calendar.google.com/calendar/ical/${enc}/public/basic.ics`, // ICS feed (requires Public)
	};
}
