// quick-ics-lite.js
function unfoldLines(text) {
	return text.replace(/\r?\n[ \t]/g, ''); // join folded lines
}

function splitBlocks(text, name) {
	const out = [];
	const begin = `BEGIN:${name}`;
	const end = `END:${name}`;
	let i = 0;
	while (true) {
		const b = text.indexOf(begin, i);
		if (b === -1) break;
		const e = text.indexOf(end, b);
		if (e === -1) break;
		out.push(text.slice(b + begin.length, e).trim());
		i = e + end.length;
	}
	return out;
}

function parseProps(block) {
	const obj = {};
	for (const line of block.split(/\r?\n/)) {
		if (!line || line.startsWith('BEGIN') || line.startsWith('END')) continue;
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		const head = line.slice(0, idx);
		const value = line.slice(idx + 1).trim();
		const [name, ...paramPairs] = head.split(';');
		const key = name.toUpperCase();

		// store params like TZID=Europe/Stockholm
		const params = Object.fromEntries(
			paramPairs.map((p) => {
				const i = p.indexOf('=');
				return i === -1 ? [p.toUpperCase(), true] : [p.slice(0, i).toUpperCase(), p.slice(i + 1)];
			})
		);

		// allow duplicates (RDATE/EXDATE/etc.)
		if (obj[key]) {
			if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
			obj[key].push({ value, params });
		} else {
			obj[key] = { value, params };
		}
	}
	return obj;
}

function parseDate(prop) {
	if (!prop) return null;
	const { value, params } = prop;
	if (params?.VALUE === 'DATE') {
		// all-day
		const y = value.slice(0, 4),
			m = value.slice(4, 6),
			d = value.slice(6, 8);
		return { allDay: true, date: `${y}-${m}-${d}` };
	}
	// date-time
	// support Z or local with TZID
	const tzid = params?.TZID;
	if (value.endsWith('Z')) return { allDay: false, dateTime: new Date(value).toISOString() };
	// naive local → treat as Europe/Stockholm if tzid says so (or just append Z if you accept UTC)
	return {
		allDay: false,
		dateTime: new Date(value.replace(/(\d{8})T(\d{6})/, '$1T$2Z')).toISOString(),
		tzid,
	};
}

// —— main ——
export function parseICSBasic(text) {
	const unfolded = unfoldLines(text);
	const vevents = splitBlocks(unfolded, 'VEVENT').map(parseProps);

	return vevents.map((v) => {
		const start = parseDate(v.DTSTART);
		const end = parseDate(v.DTEND);

		const { moment, sign, kurs, raw } = (() => {
			const s = v.SUMMARY?.value ?? '';
			const moment = s.match(/Moment:\s*([^:]+?)(?=\s+(Aktivitetstyp:|$))/i)?.[1]?.trim();
			const sign = s.match(/Sign:\s*([^\s]+)(?=\s|$)/i)?.[1]?.trim();
			const kurs = s
				.match(/Kurs\.grp:\s*([^]+?)(?=\s+(Hjälpm\.:|Sign:|Moment:|Aktivitetstyp:|$))/i)?.[1]
				?.trim();
			return { moment, sign, kurs, raw: s };
		})();

		const location = (v.LOCATION?.value || '')
			.trim()
			.replace(/\s{2,}/g, ' ')
			.replace(/\s+([A-Z]{2}:[A-Z0-9]+)/g, ', $1');
		const title = location || moment || (v.SUMMARY?.value ?? 'Untitled');

		const startObj = start?.allDay ? { date: start.date } : { dateTime: start?.dateTime };
		const endObj = end?.allDay ? { date: end.date } : { dateTime: end?.dateTime };

		return {
			iCalUID: v.UID?.value,
			summary: title,
			location,
			description: [moment, kurs, sign].filter(Boolean).join(', ') || v.SUMMARY?.value,
			start: startObj,
			end: endObj,
			status:
				(v.STATUS?.value || 'CONFIRMED').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed',
			transparency:
				(v.TRANSP?.value || 'OPAQUE').toUpperCase() === 'TRANSPARENT' ? 'transparent' : 'opaque',
		};
	});
}
