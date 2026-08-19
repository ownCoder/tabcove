/**
 * Tabcove — formatting helpers.
 *
 * Pure functions, no DOM, no chrome APIs. Unit-tested under Node.
 */

/**
 * Human relative time. Short by design — these appear in dense list rows where
 * "3 days ago" earns its width and "on 16 August 2026 at 14:03" does not.
 */
export function relativeTime(ts, now = Date.now()) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 45) return 'just now';
  if (s < 90) return 'a minute ago';

  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minutes ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? 'an hour ago' : `${h} hours ago`;

  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'last week';
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  const y = Math.floor(d / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}

/** Full timestamp for tooltips and export headers. */
export function absoluteTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

/** ISO date only — used in generated collection titles and filenames. */
export function isoDate(ts = Date.now()) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Filename-safe timestamp, e.g. 2026-08-19-1432. */
export function fileStamp(ts = Date.now()) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** "1 tab" / "12 tabs" — pluralisation without a library. */
export function plural(n, singular, pluralForm = null) {
  const word = n === 1 ? singular : pluralForm || `${singular}s`;
  return `${formatNumber(n)} ${word}`;
}

/** Thousands separators, with a graceful fallback. */
export function formatNumber(n) {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

/** Byte sizes for the storage meter. */
export function bytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** Hostname without `www.`, for the muted right-hand column of a tab row. */
export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** A readable, truncated URL for tooltips and exports. */
export function prettyUrl(url, max = 80) {
  try {
    const u = new URL(url);
    const shown = u.hostname.replace(/^www\./, '') + u.pathname + u.search;
    return shown.length > max ? `${shown.slice(0, max - 1)}…` : shown;
  } catch {
    return url.length > max ? `${url.slice(0, max - 1)}…` : url;
  }
}

/** Middle-truncate, so both ends of a title stay readable. */
export function truncate(text, max = 60) {
  if (!text || text.length <= max) return text || '';
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`;
}

/**
 * Default title for a new collection.
 * Users rename these constantly, so the default only has to be *distinguishing*,
 * not clever.
 */
export function defaultCollectionTitle(tabs, style = 'date') {
  const now = new Date();
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (style === 'count') return `${plural(tabs.length, 'tab')} — ${isoDate()}`;

  if (style === 'hostname' && tabs.length) {
    const counts = new Map();
    for (const t of tabs) {
      const h = hostname(t.url);
      if (h) counts.set(h, (counts.get(h) || 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [h, n] of counts) {
      if (n > bestN) {
        best = h;
        bestN = n;
      }
    }
    if (best && bestN >= 2) return `${best} — ${isoDate()}`;
  }

  return `${isoDate()} at ${time}`;
}
