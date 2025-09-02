/**
 * Turn a Schema.jsp URL into the equivalent SchemaICAL.ics URL.
 * Keeps all query parameters exactly as-is.
 * @param {string} inputURL
 * @returns {string}
 */
export default function parseURL(inputURL) {
  const u = new URL(inputURL);

  const parts = u.pathname.split('/');
  const last = parts.pop() || '';

  if (/^Schema\.jsp$/i.test(last)) {
    parts.push('SchemaICAL.ics');
  } else if (!/^SchemaICAL\.ics$/i.test(last)) {
    // If it's some variant including Schema.jsp inside the name, swap it.
    parts.push(last.replace(/Schema\.jsp/i, 'SchemaICAL.ics'));
  } else {
    parts.push(last); // already .ics
  }

  u.pathname = parts.join('/').replace(/\/{2,}/g, '/');
  return u.toString();
}