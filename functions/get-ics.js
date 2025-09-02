/**
 * Turn a Schema.jsp URL into the equivalent SchemaICAL.ics URL
 * AND extract resource code(s) from the "resurser" query param.
 *
 * @param {string} inputURL
 * @returns {{ icsUrl: string, resourceId: string|null, resourceIds: string[] }}
 */
export default function parseURL(inputURL) {
	const u = new URL(inputURL);

	// ---- swap Schema.jsp -> SchemaICAL.ics (keep all query params) ----
	const parts = u.pathname.split('/');
	const last = parts.pop() || '';
	if (/^Schema\.jsp$/i.test(last)) {
		parts.push('SchemaICAL.ics');
	} else if (!/^SchemaICAL\.ics$/i.test(last)) {
		parts.push(last.replace(/Schema\.jsp/i, 'SchemaICAL.ics'));
	} else {
		parts.push(last);
	}
	u.pathname = parts.join('/').replace(/\/{2,}/g, '/');

	// ---- extract resource code(s) from ?resurser=... ----
	// Supports multiple resurser params and comma-separated lists
	const resVals = u.searchParams.getAll('resurser');
	const resourceIds = resVals
		.join(',') // merge multiple params
		.split(',') // split comma list
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => s.split('.').pop()); // keep part after last dot (e.g., "p.TGIAR25h" -> "TGIAR25h")

	return {
		icsUrl: u.toString(),
		resourceId: resourceIds[0] ?? null, // first one (handy for filenames)
		resourceIds,
	};
}
