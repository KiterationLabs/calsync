export async function upsertByICalUID(calendarId, payload) {
	const existing = await findByICalUID(calendarId, payload.iCalUID);
	if (existing) {
		return updateEvent(calendarId, existing.id, payload);
	}
	return createEvent(calendarId, payload); // uses events.import
}
