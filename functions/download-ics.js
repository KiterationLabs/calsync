// download-ics.js
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Download an ICS file and save it locally.
 * @param {string} icsUrl - The (final) .ics URL to fetch.
 * @param {string} outFilePath - Where to save it (e.g. "./ics/TGIAR25h.ics").
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ path:string, bytes:number, contentType:string|null, etag:string|null, lastModified:string|null }>}
 */
export default async function downloadIcs(icsUrl, outFilePath, opts = {}) {
	const { timeoutMs = 15000 } = opts;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(icsUrl, {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				// servers sometimes send text/plain or octet-stream; accept broadly
				accept: 'text/calendar, text/plain, application/octet-stream; q=0.9, */*; q=0.1',
			},
		});

		if (!res.ok) {
			throw new Error(`Failed to fetch ICS (${res.status} ${res.statusText})`);
		}

		const buf = Buffer.from(await res.arrayBuffer());

		await fs.mkdir(path.dirname(outFilePath), { recursive: true });
		await fs.writeFile(outFilePath, buf);

		return {
			path: outFilePath,
			bytes: buf.length,
			contentType: res.headers.get('content-type'),
			etag: res.headers.get('etag'),
			lastModified: res.headers.get('last-modified'),
		};
	} finally {
		clearTimeout(timer);
	}
}
