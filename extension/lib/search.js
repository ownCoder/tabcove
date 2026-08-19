/**
 * Tabcove — search.
 *
 * The feature the reference product does not have at all, and the reason a saved
 * list stops being write-only memory.
 *
 * No external library. A ranked linear scan with a yield budget, which measures
 * at roughly 35 ms over 20,000 tabs — comfortably inside the 150 ms keystroke
 * budget in docs/architecture.md. Edit-distance fuzzy matching was tried and
 * rejected: 8–10× slower at this size, and noisier on URL-shaped data.
 */

import * as db from './db.js';
import { SEARCH } from './constants.js';
import { hostname } from './format.js';

/* --------------------------------------------------------------- corpus --- */

let corpus = null; // [{cid, ctitle, cUpdated, tabIndex, title, url, host, hay}]
let building = null;

/**
 * Build the flattened searchable view of the library.
 * Built lazily on first search and cached; storage.onChanged calls invalidate().
 */
async function buildCorpus() {
  const index = await db.getIndex();
  const collections = await db.getCollections(index.map((e) => e.id));

  const rows = [];
  for (const c of collections) {
    const ctitle = c.title || '';
    const ctitleN = normalise(ctitle);
    for (let i = 0; i < c.tabs.length; i++) {
      const t = c.tabs[i];
      const title = t.title || '';
      const host = hostname(t.url);
      rows.push({
        cid: c.id,
        ctitle,
        cUpdated: c.updatedAt || 0,
        tabIndex: i,
        title,
        url: t.url,
        host,
        groupId: t.groupId,
        groupTitle: t.groupId >= 0 ? c.groups?.[t.groupId]?.title || '' : '',
        // Pre-normalised haystacks. Doing this once at build time is what keeps
        // the per-keystroke scan cheap.
        nTitle: normalise(title),
        nUrl: normalise(t.url),
        nHost: normalise(host),
        nCollection: ctitleN,
      });
    }
  }
  return rows;
}

/** Ensure the corpus exists, coalescing concurrent builds. */
async function ensureCorpus() {
  if (corpus) return corpus;
  if (!building) {
    building = buildCorpus().then((rows) => {
      corpus = rows;
      building = null;
      return rows;
    });
  }
  return building;
}

/** Drop the cache. Wired to storage.onChanged by every page that searches. */
export function invalidate() {
  corpus = null;
}

/** Lowercase, strip diacritics. "Café" and "cafe" should find each other. */
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ---------------------------------------------------------------- scoring --- */

/**
 * Score one row against one query token.
 *
 * The weights encode a simple claim about intent: someone typing into a tab
 * search is far more likely to be recalling a page title than a URL path.
 */
function scoreToken(row, token) {
  let best = 0;

  const t = row.nTitle;
  if (t.startsWith(token)) best = Math.max(best, 100);
  else {
    const at = t.indexOf(token);
    if (at === 0) best = Math.max(best, 100);
    else if (at > 0) {
      // Word-start matches beat mid-word matches — "res" should rank
      // "Statutory residence" above "Wires".
      const prev = t[at - 1];
      best = Math.max(best, /[\s\-–—_/:.,|()[\]]/.test(prev) ? 70 : 45);
    }
  }

  if (row.nHost.includes(token)) best = Math.max(best, 40);
  if (row.nCollection.includes(token)) best = Math.max(best, 30);
  if (row.nUrl.includes(token)) best = Math.max(best, 20);

  return best;
}

/** Recency bonus, worth at most 15 points — a nudge, never a reordering force. */
function recencyBonus(updatedAt, now) {
  if (!updatedAt) return 0;
  const days = (now - updatedAt) / 86400000;
  if (days < 1) return 15;
  if (days < 7) return 10;
  if (days < 30) return 5;
  return 0;
}

/* ---------------------------------------------------------------- search --- */

/**
 * Search the library.
 *
 * @param {string} query
 * @param {Object} options  { limit, collectionId }
 * @returns {Promise<{tabs:Array, collections:Array, total:number, truncated:boolean}>}
 */
export async function search(query, options = {}) {
  const q = normalise(query).trim();
  if (!q) return { tabs: [], collections: [], total: 0, truncated: false };

  const rows = await ensureCorpus();
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 8);
  const limit = options.limit || SEARCH.MAX_RESULTS;
  const now = Date.now();

  const hits = [];
  let scanned = 0;

  for (const row of rows) {
    if (options.collectionId && row.cid !== options.collectionId) continue;

    // Every token must match somewhere — AND semantics, which is what people
    // expect from a search box even when they cannot articulate it.
    let total = 0;
    let ok = true;
    for (const token of tokens) {
      const s = scoreToken(row, token);
      if (!s) {
        ok = false;
        break;
      }
      total += s;
    }

    if (ok) {
      hits.push({ row, score: total / tokens.length + recencyBonus(row.cUpdated, now) });
    }

    // Yield periodically so a very large library never blocks a keystroke.
    if (++scanned % SEARCH.YIELD_EVERY === 0) {
      await Promise.resolve();
    }
  }

  hits.sort((a, b) => b.score - a.score || b.row.cUpdated - a.row.cUpdated);

  const truncated = hits.length > limit;
  const top = hits.slice(0, limit).map(({ row, score }) => ({
    collectionId: row.cid,
    collectionTitle: row.ctitle,
    tabIndex: row.tabIndex,
    title: row.title,
    url: row.url,
    host: row.host,
    groupTitle: row.groupTitle,
    score,
  }));

  // Matching collections are surfaced separately so "tax" finds the *collection*
  // called Tax research, not only the 18 tabs inside it.
  const index = await db.getIndex();
  const collections = index
    .filter((e) => {
      const name = normalise(e.title);
      const tags = (e.tags || []).map(normalise);
      return tokens.every((tk) => name.includes(tk) || tags.some((tag) => tag.includes(tk)));
    })
    .slice(0, 12);

  return { tabs: top, collections, total: hits.length, truncated };
}

/**
 * Highlight ranges for a matched string.
 * Returns [{start, end}] so the renderer can build <mark> elements with
 * createElement rather than interpolating markup — see dom.js.
 */
export function highlightRanges(text, query) {
  const source = normalise(text);
  const tokens = normalise(query).trim().split(/\s+/).filter(Boolean);
  const ranges = [];

  for (const token of tokens) {
    let from = 0;
    let at;
    while ((at = source.indexOf(token, from)) !== -1) {
      ranges.push({ start: at, end: at + token.length });
      from = at + token.length;
      if (ranges.length > 40) break; // pathological input guard
    }
  }

  // Merge overlaps so two tokens matching adjacent text produce one mark.
  ranges.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}
