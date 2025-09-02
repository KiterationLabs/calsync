// functions/calendar/upsertEventsFromFile.js (ESM)
import fs from 'node:fs/promises';
import path from 'node:path';
import { getCalendarClient } from './calendarAPI.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Backoff + retry helper for rate-limit/server errors (works for POST, too). */
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
				// Calendar sometimes uses 403 for quota:
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

/** Simple global throttle (QPS) shared by all workers. */
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

async function findByICalUID(cal, calendarId, iCalUID) {
	const { data } = await callWithRetry(
		() =>
			cal.events.list({
				calendarId,
				iCalUID,
				maxResults: 50,
				singleEvents: true,
				showDeleted: false,
			}),
		// GETs are usually retried by gaxios, but we keep our own for symmetry
		{ maxAttempts: 5, baseDelayMs: 400 }
	);
	return data.items ?? [];
}

function chooseBestCandidate(candidates, incoming) {
	if (!candidates.length) return null;
	const incStart = normalizeWhen(incoming.start);
	if (incStart?.ts) {
		const m = candidates.find((c) => normalizeWhen(c.start)?.ts === incStart.ts);
		if (m) return m;
	}
	if (incStart?.date) {
		const m = candidates.find((c) => normalizeWhen(c.start)?.date === incStart.date);
		if (m) return m;
	}
	return candidates[0];
}

/**
 * Upsert events from a JSON file into a calendar, with throttling & retries.
 *
 * @param {string} calendarId
 * @param {string} jsonFilePath
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false]
 * @param {number}  [opts.concurrency=2]            // keep low for Calendar writes
 * @param {number}  [opts.throttleMs=350]           // min gap between writes (per project)
 * @param {number}  [opts.maxAttempts=7]            // max attempts per write call
 * @param {number}  [opts.baseDelayMs=600]          // backoff base for retries
 * @returns {Promise<{created:number, updated:number, skipped:number, errors:number}>}
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

	// Process oldest → newest (no magic, just nicer logs)
	items.sort(
		(a, b) =>
			new Date(a.start?.dateTime ?? a.start?.date) - new Date(b.start?.dateTime ?? b.start?.date)
	);

	let created = 0,
		updated = 0,
		skipped = 0,
		errors = 0;
	const throttle = makeThrottle(throttleMs);

	// worker pool
	let idx = 0;
	async function worker() {
		while (idx < items.length) {
			const i = idx++;
			const evt = items[i];
			try {
				if (!evt.iCalUID) throw new Error('Missing iCalUID');

				const candidates = await findByICalUID(cal, calendarId, evt.iCalUID);
				const existing = chooseBestCandidate(candidates, evt);

				if (!existing) {
					// CREATE via import
					const body = toWritableBody(evt, { includeICalUID: true });
					if (dryRun) {
						console.log(`[DRY] create  ${evt.iCalUID}  ${evt.summary}`);
					} else {
						await throttle();
						await callWithRetry(() => cal.events.import({ calendarId, requestBody: body }), {
							maxAttempts,
							baseDelayMs,
						});
						console.log(`created  ${evt.iCalUID}  ${evt.summary}`);
					}
					created++;
					continue;
				}

				// UPDATE if changed
				if (sameEvent(existing, evt)) {
					skipped++;
					continue;
				}

				const patchBody = toWritableBody(evt);
				if (dryRun) {
					console.log(`[DRY] update  ${evt.iCalUID}  ${evt.summary}`);
				} else {
					await throttle();
					await callWithRetry(
						() => cal.events.patch({ calendarId, eventId: existing.id, requestBody: patchBody }),
						{ maxAttempts, baseDelayMs }
					);
					console.log(`updated  ${evt.iCalUID}  ${evt.summary}`);
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
