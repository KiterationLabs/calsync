export async function updateEvent(calendarId, eventId, event) {
	const calendar = await getCalendarClient();
	const { data } = await calendar.events.update({
		calendarId,
		eventId,
		requestBody: event,
	});
	return data;
}
