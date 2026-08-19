/**
 * Tabcove — export.
 *
 * Five formats, one click, no limits, no account. Export is deliberately
 * generous: a product whose whole pitch is "your data is safe" cannot also be
 * the product that makes leaving difficult.
 *
 * Escaping is treated as a security concern, not a formatting one. Titles come
 * from arbitrary web pages, so HTML export escapes, CSV export defuses formula
 * injection, and Markdown export escapes link syntax.
 */

import * as db from './db.js';
import { APP_VERSION } from './constants.js';
import { absoluteTime, isoDate, fileStamp, plural } from './format.js';

/* ---------------------------------------------------------------- helpers --- */

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * CSV field escaping, including formula-injection defence.
 * A saved page title of `=cmd|'/c calc'!A1` must not execute when the export is
 * opened in a spreadsheet. Prefixing with an apostrophe is the standard fix.
 */
const escapeCsv = (value) => {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Escape the characters that would break a Markdown link. */
const escapeMd = (s) => String(s).replace(/([[\]\\])/g, '\\$1').replace(/\r?\n/g, ' ');

/** Gather the whole library, or a subset. */
async function gather(collectionIds = null) {
  const index = await db.getIndex();
  const ids = collectionIds || index.map((e) => e.id);
  const collections = await db.getCollections(ids);
  return { index, collections };
}

/* ---------------------------------------------------------------- formats --- */

/**
 * JSON — the lossless format, and the one `importer.js` round-trips exactly.
 * Versioned so a future schema can be recognised rather than guessed at.
 */
export function toJson(collections, meta = {}) {
  return JSON.stringify(
    {
      format: 'tabcove-export',
      formatVersion: 1,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      stats: {
        collections: collections.length,
        tabs: collections.reduce((n, c) => n + c.tabs.length, 0),
      },
      ...meta,
      collections: collections.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        pinned: !!c.pinned,
        locked: !!c.locked,
        tags: c.tags || [],
        note: c.note || '',
        windows: c.windows || 1,
        groups: c.groups || [],
        tabs: c.tabs.map((t) => ({
          url: t.url,
          title: t.title,
          pinned: !!t.pinned,
          groupId: t.groupId,
          windowIx: t.windowIx,
          savedAt: t.savedAt,
        })),
      })),
    },
    null,
    2
  );
}

/**
 * HTML — a standalone, self-contained page of clickable links.
 * Opens in any browser, prints cleanly, and needs nothing installed. This is the
 * format to hand to someone who wants their tabs back in ten years.
 */
export function toHtml(collections) {
  const totalTabs = collections.reduce((n, c) => n + c.tabs.length, 0);

  const body = collections
    .map((c) => {
      const groups = c.groups || [];
      const ungrouped = c.tabs.filter((t) => t.groupId < 0 || !groups[t.groupId]);
      const grouped = groups
        .map((g, gi) => {
          const tabs = c.tabs.filter((t) => t.groupId === gi);
          if (!tabs.length) return '';
          return `
      <div class="group" style="--gc:${escapeHtml(groupHex(g.color))}">
        <div class="group-name">${escapeHtml(g.title || 'Untitled group')}</div>
        <ul>${tabs.map(linkHtml).join('')}</ul>
      </div>`;
        })
        .join('');

      return `
    <section class="collection">
      <h2>${escapeHtml(c.title)}</h2>
      <p class="meta">${plural(c.tabs.length, 'tab')} · saved ${escapeHtml(absoluteTime(c.createdAt))}${
        c.tags?.length ? ` · ${escapeHtml(c.tags.join(', '))}` : ''
      }</p>
      ${grouped}
      ${ungrouped.length ? `<ul>${ungrouped.map(linkHtml).join('')}</ul>` : ''}
    </section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tabcove export — ${isoDate()}</title>
<style>
  :root { color-scheme: light dark; --bg:#f7f9fa; --fg:#0f1b1e; --muted:#5a6b6f;
          --card:#fff; --line:#dce4e6; --brand:#0e7c86; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0c1416; --fg:#e8f1f2; --muted:#9bb0b4; --card:#131f22; --line:#25373c; --brand:#3fb2bc; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 20px 64px; background:var(--bg); color:var(--fg);
         font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; }
  header { border-bottom:2px solid var(--brand); padding-bottom:16px; margin-bottom:28px; }
  h1 { margin:0 0 6px; font-size:22px; letter-spacing:-.02em; }
  .sub { color:var(--muted); font-size:13px; margin:0; }
  .collection { background:var(--card); border:1px solid var(--line); border-radius:12px;
                padding:18px 20px; margin-bottom:16px; }
  h2 { margin:0 0 4px; font-size:16px; letter-spacing:-.01em; }
  .meta { margin:0 0 12px; color:var(--muted); font-size:12px; }
  ul { list-style:none; margin:0; padding:0; }
  li { padding:4px 0; }
  a { color:var(--brand); text-decoration:none; overflow-wrap:anywhere; }
  a:hover, a:focus { text-decoration:underline; }
  .host { color:var(--muted); font-size:12px; margin-left:6px; }
  .group { border-left:3px solid var(--gc,var(--line)); padding-left:12px; margin:12px 0; }
  .group-name { font-size:12px; font-weight:600; color:var(--gc,var(--muted));
                text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
  footer { color:var(--muted); font-size:12px; text-align:center; margin-top:32px; }
  @media print { body{background:#fff} .collection{break-inside:avoid; border-color:#ccc} }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Tabcove export</h1>
    <p class="sub">${plural(collections.length, 'collection')} · ${plural(totalTabs, 'tab')} · ${escapeHtml(
      absoluteTime(Date.now())
    )}</p>
  </header>
  ${body}
  <footer>Exported from Tabcove ${escapeHtml(APP_VERSION)} — this file is self-contained and needs nothing installed to read.</footer>
</div>
</body>
</html>`;
}

function linkHtml(tab) {
  let host = '';
  try {
    host = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    /* keep host empty */
  }
  return `<li><a href="${escapeHtml(tab.url)}" rel="noreferrer noopener">${escapeHtml(
    tab.title || tab.url
  )}</a><span class="host">${escapeHtml(host)}</span></li>`;
}

function groupHex(color) {
  const map = {
    grey: '#5F6368',
    blue: '#1A73E8',
    red: '#D93025',
    yellow: '#F9AB00',
    green: '#1E8E3E',
    pink: '#D01884',
    purple: '#9334E6',
    cyan: '#007B83',
    orange: '#FA903E',
  };
  return map[color] || map.grey;
}

/** Markdown — for Obsidian, Notion, a README, or a GitHub issue. */
export function toMarkdown(collections) {
  const lines = [
    `# Tabcove export`,
    '',
    `${plural(collections.length, 'collection')} · ${plural(
      collections.reduce((n, c) => n + c.tabs.length, 0),
      'tab'
    )} · ${absoluteTime(Date.now())}`,
    '',
  ];

  for (const c of collections) {
    lines.push(`## ${escapeMd(c.title)}`, '');
    lines.push(`*${plural(c.tabs.length, 'tab')} · saved ${absoluteTime(c.createdAt)}*`, '');

    const groups = c.groups || [];
    groups.forEach((g, gi) => {
      const tabs = c.tabs.filter((t) => t.groupId === gi);
      if (!tabs.length) return;
      lines.push(`### ${escapeMd(g.title || 'Untitled group')}`, '');
      for (const t of tabs) lines.push(`- [${escapeMd(t.title || t.url)}](${t.url})`);
      lines.push('');
    });

    const ungrouped = c.tabs.filter((t) => t.groupId < 0 || !groups[t.groupId]);
    for (const t of ungrouped) lines.push(`- [${escapeMd(t.title || t.url)}](${t.url})`);
    lines.push('');
  }

  return lines.join('\n');
}

/** CSV — for spreadsheets and scripts. */
export function toCsv(collections) {
  const rows = [
    ['collection', 'group', 'title', 'url', 'pinned', 'saved_at'].map(escapeCsv).join(','),
  ];

  for (const c of collections) {
    for (const t of c.tabs) {
      const group = t.groupId >= 0 ? c.groups?.[t.groupId]?.title || '' : '';
      rows.push(
        [
          c.title,
          group,
          t.title || '',
          t.url,
          t.pinned ? 'yes' : 'no',
          new Date(t.savedAt || c.createdAt).toISOString(),
        ]
          .map(escapeCsv)
          .join(',')
      );
    }
  }

  return rows.join('\r\n');
}

/**
 * Plain text — one URL and title per line, grouped by collection.
 *
 * Also the interchange format: this is deliberately close to what OneTab
 * produces, so a user can move data in either direction. Making it easy to
 * leave is the point.
 */
export function toText(collections) {
  const out = [];
  for (const c of collections) {
    out.push(`--- ${c.title} (${plural(c.tabs.length, 'tab')}) ---`);
    for (const t of c.tabs) out.push(`${t.url} | ${t.title || ''}`);
    out.push('');
  }
  return out.join('\n');
}

/* ------------------------------------------------------------- public API --- */

const FORMATS = {
  json: { fn: toJson, ext: 'json', mime: 'application/json' },
  html: { fn: toHtml, ext: 'html', mime: 'text/html' },
  markdown: { fn: toMarkdown, ext: 'md', mime: 'text/markdown' },
  csv: { fn: toCsv, ext: 'csv', mime: 'text/csv' },
  text: { fn: toText, ext: 'txt', mime: 'text/plain' },
};

/**
 * Produce an export payload.
 * @returns {Promise<{filename, content, mime, stats}>}
 */
export async function exportLibrary(format = 'json', collectionIds = null) {
  const spec = FORMATS[format];
  if (!spec) throw new Error(`Unknown export format: ${format}`);

  const { collections } = await gather(collectionIds);
  const content = spec.fn(collections);

  return {
    filename: `tabcove-${fileStamp()}.${spec.ext}`,
    content,
    mime: spec.mime,
    stats: {
      collections: collections.length,
      tabs: collections.reduce((n, c) => n + c.tabs.length, 0),
      bytes: content.length,
    },
  };
}

/** Export exactly one collection, named after it. */
export async function exportCollection(collectionId, format = 'json') {
  const spec = FORMATS[format];
  if (!spec) throw new Error(`Unknown export format: ${format}`);

  const collection = await db.getCollection(collectionId);
  if (!collection) throw new Error('That collection no longer exists.');

  const slug =
    collection.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'collection';

  return {
    filename: `tabcove-${slug}-${fileStamp()}.${spec.ext}`,
    content: spec.fn([collection]),
    mime: spec.mime,
    stats: { collections: 1, tabs: collection.tabs.length },
  };
}
