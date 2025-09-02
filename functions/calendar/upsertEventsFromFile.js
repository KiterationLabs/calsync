// functions/calendar/upsertEventsFromFile.js (ESM)
import fs from 'node:fs/promises';
import path from 'node:path';
import { getCalendarClient } from './calendarAPI.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function keyByUidStart(e) {
	const uid = e.iCalUID || e.id || '';
	const start = e.start?.dateTime ? new Date(e.start.dateTime).getTime() : e.start?.date || '';
	return `${uid}::${start}`;
}

async function findByICalUID(cal, calendarId, iCalUID) {
	const { data } = await cal.events.list({
		calendarId,
		iCalUID,
		singleEvents: true,
		showDeleted: false,
		maxResults: 50,
	});
	return data.items ?? [];
}

function chooseBestCandidate(candidates, incoming) {
	if (!candidates.length) return null;
	const incTs = incoming.start?.dateTime ? new Date(incoming.start.dateTime).getTime() : null;
	const incDate = !incTs ? incoming.start?.date : null;

	if (incTs) {
		const m = candidates.find(
			(c) => c.start?.dateTime && new Date(c.start.dateTime).getTime() === incTs
		);
		if (m) return m;
	}
	if (incDate) {
		const m = candidates.find((c) => c.start?.date === incDate);
		if (m) return m;
	}
	return candidates[0];
}

async function prefetchExistingIndex(cal, calendarId, items) {
	const starts = items
		.map((e) => new Date(e.start?.dateTime ?? e.start?.date).getTime())
		.filter(Number.isFinite);

	if (!starts.length) return new Map();

	const minTs = Math.min(...starts);
	const maxTs = Math.max(...starts);

	const timeMin = new Date(minTs - 24 * 3600 * 1000).toISOString();
	const timeMax = new Date(maxTs + 24 * 3600 * 1000).toISOString();

	const idx = new Map();
	let pageToken;
	do {
		const { data } = await cal.events.list({
			calendarId,
			timeMin,
			timeMax,
			singleEvents: true,
			orderBy: 'startTime',
			showDeleted: false,
			maxResults: 2500,
			pageToken,
			// fields: 'items(id,iCalUID,start,end,summary,description,location,extendedProperties),nextPageToken'
		});
		for (const ev of data.items ?? []) {
			idx.set(keyByUidStart(ev), ev);
		}
		pageToken = data.nextPageToken;
	} while (pageToken);
	return idx;
}

/** Backoff + retry helper */
async function callWithRetry(fn, { maxAttempts = 7, baseDelayMs = 600, maxDelayMs = 10_000 } = {}) {
	let attempt = 0,
		lastErr;
	while (attempt < maxAttempts) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			const status = err?.response?.status;
			const reason = err?.response?.data?.error?.errors?.[0]?.reason;
			const retriable =
				status === 429 ||
				status === 500 ||
				status === 503 ||
				(status === 403 && /rateLimitExceeded|userRateLimitExceeded/i.test(reason ?? ''));
			if (!retriable) throw err;

			const retryAfter = Number(err?.response?.headers?.['retry-after']);
			const backoff = retryAfter
				? Math.max(0, retryAfter * 1000)
				: Math.min(maxDelayMs, baseDelayMs * 2 ** attempt) + Math.floor(Math.random() * 250);

			attempt += 1;
			await sleep(backoff);
		}
	}
	throw lastErr;
}

/** Simple global throttle (QPS) */
function makeThrottle(throttleMs) {
	let nextAt = 0;
	return async function throttle() {
		const now = Date.now();
		if (now < nextAt) await sleep(nextAt - now);
		nextAt = Math.max(now, nextAt) + throttleMs;
	};
}

function normalizeWhen(when) {
	if (!when) return null;
	if (when.date) return { date: when.date };
	if (when.dateTime) return { ts: new Date(when.dateTime).getTime() };
	return null;
}

function pickForCompare(e) {
	return {
		summary: e.summary ?? '',
		description: e.description ?? '',
		location: e.location ?? '',
		start: normalizeWhen(e.start),
		end: normalizeWhen(e.end),
		status: e.status ?? 'confirmed',
		transparency: e.transparency ?? 'opaque',
		kronoxSummaryRaw: e?.extendedProperties?.private?.kronoxSummaryRaw ?? '',
	};
}

function sameEvent(a, b) {
	return JSON.stringify(pickForCompare(a)) === JSON.stringify(pickForCompare(b));
}

function toWritableBody(e, { includeICalUID = false } = {}) {
	const body = {
		summary: e.summary,
		location: e.location,
		description: e.description,
		start: e.start,
		end: e.end,
		status: e.status,
		transparency: e.transparency,
		extendedProperties: e.extendedProperties,
	};
	if (includeICalUID && e.iCalUID) body.iCalUID = e.iCalUID;
	return body;
}

/**
 * Upsert events from a JSON file into a calendar, with throttling & retries.
 */
export async function upsertEventsFromJsonFile(
	calendarId,
	jsonFilePath,
	{ dryRun = false, concurrency = 2, throttleMs = 350, maxAttempts = 7, baseDelayMs = 600 } = {}
) {
	const cal = await getCalendarClient();

	const abs = path.resolve(jsonFilePath);
	const raw = await fs.readFile(abs, 'utf8');
	const items = JSON.parse(raw);
	if (!Array.isArray(items)) throw new Error('JSON must be an array of events');

	// process oldest → newest
	items.sort(
		(a, b) =>
			new Date(a.start?.dateTime ?? a.start?.date) - new Date(b.start?.dateTime ?? b.start?.date)
	);

	// Prefetch once and reuse
	const existingIndex = await prefetchExistingIndex(cal, calendarId, items);

	let created = 0,
		updated = 0,
		skipped = 0,
		errors = 0;
	const throttle = makeThrottle(throttleMs);

	let idx = 0;
	async function worker() {
		while (idx < items.length) {
			const i = idx++;
			const evt = items[i];

			try {
				if (!evt.iCalUID) throw new Error('Missing iCalUID');

				// 1) Try prefetch index
				let existing = existingIndex.get(keyByUidStart(evt));

				// 2) Fallback: event time may have moved → search by UID
				if (!existing) {
					const candidates = await findByICalUID(cal, calendarId, evt.iCalUID);
					existing = chooseBestCandidate(candidates, evt);
				}

				if (!existing) {
					// 3) CREATE (no match anywhere)
					const body = toWritableBody(evt, { includeICalUID: true });
					if (dryRun) {
						console.log(`[DRY] create  ${evt.iCalUID}  ${evt.summary}`);
					} else {
						await throttle();
						const { data: createdEv } = await callWithRetry(
							() => cal.events.import({ calendarId, requestBody: body }),
							{ maxAttempts, baseDelayMs }
						);
						console.log(`created  ${evt.iCalUID}  ${evt.summary}`);
						existingIndex.set(keyByUidStart(createdEv), createdEv);
					}
					created++;
					continue;
				}

				// 4) UPDATE if changed
				if (sameEvent(existing, evt)) {
					skipped++;
					continue;
				}

				const patchBody = toWritableBody(evt);
				if (dryRun) {
					console.log(`[DRY] update  ${evt.iCalUID}  ${evt.summary}`);
				} else {
					await throttle();
					const oldKey = keyByUidStart(existing);
					const { data: updatedEv } = await callWithRetry(
						() => cal.events.patch({ calendarId, eventId: existing.id, requestBody: patchBody }),
						{ maxAttempts, baseDelayMs }
					);
					console.log(`updated  ${evt.iCalUID}  ${evt.summary}`);
					existingIndex.delete(oldKey);
					existingIndex.set(keyByUidStart(updatedEv), updatedEv);
				}
				updated++;
			} catch (err) {
				errors++;
				console.error(`ERROR for ${items[i]?.iCalUID ?? '(no iCalUID)'}: ${err.message}`);
			}
		}
	}

	const workers = Array.from({ length: Math.max(1, Math.min(concurrency, 5)) }, () => worker());
	await Promise.all(workers);

	return { created, updated, skipped, errors };
}
