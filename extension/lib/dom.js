/**
 * Tabcove — minimal DOM helpers.
 *
 * There is exactly one rule enforced here, and it is a security rule:
 * DATA NEVER REACHES THE DOM AS MARKUP. Titles and URLs come from arbitrary web
 * pages, so every text path in this file goes through `textContent` and every
 * attribute through `setAttribute`. `innerHTML` appears nowhere in the codebase
 * outside developer-authored static markup, and tools/validate.py enforces that.
 */

/**
 * Create an element.
 * @param {string} tag
 * @param {Object} props  className, text, html (static only), attrs, dataset, on
 * @param {Array}  children
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  if (props.className) node.className = props.className;
  if (props.id) node.id = props.id;

  // Untrusted data path. Always textContent.
  if (props.text !== undefined && props.text !== null) node.textContent = String(props.text);

  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v === false || v === null || v === undefined) continue;
      node.setAttribute(k, v === true ? '' : String(v));
    }
  }

  if (props.dataset) {
    for (const [k, v] of Object.entries(props.dataset)) {
      if (v === null || v === undefined) continue;
      node.dataset[k] = String(v);
    }
  }

  if (props.on) {
    for (const [event, handler] of Object.entries(props.on)) {
      node.addEventListener(event, handler);
    }
  }

  if (props.style) {
    for (const [prop, value] of Object.entries(props.style)) {
      // Custom properties must go through setProperty. Object.assign onto
      // element.style silently drops anything starting with `--`, which is how
      // the tab-group colours quietly stopped rendering.
      if (prop.startsWith('--')) node.style.setProperty(prop, value);
      else node.style[prop] = value;
    }
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

/** Shorthands. */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/** Remove every child. Faster and safer than `innerHTML = ''`. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/**
 * Inline SVG icon from the shared 24×24 set.
 * Paths are developer-authored constants, so building the markup as a string is
 * safe here — no data is interpolated.
 */
const ICONS = {
  stow: 'M4 7h16M4 12h10M4 17h7M17 13v7m0 0 3-3m-3 3-3-3',
  library: 'M4 5h6v14H4zM14 5h6v14h-6M14 9h6M14 15h6',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35',
  restore: 'M4 12a8 8 0 1 0 2.34-5.66M4 4v4h4',
  group: 'M4 6h7v5H4zM13 6h7v5h-7zM4 13h16v5H4z',
  pin: 'M12 3v8m0 0-4 4h8l-4-4Zm0 6v6',
  trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  undo: 'M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-3',
  export: 'M12 16V4m0 0L8 8m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  import: 'M12 4v12m0 0 4-4m-4 4-4-4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  shield: 'M12 3l7 3v6c0 4.4-3 8.2-7 9-4-.8-7-4.6-7-9V6l7-3Zm-3 9 2 2 4-4',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
  duplicate: 'M9 9h10v10H9zM5 15V5h10',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  check: 'M4 12l5 5L20 6',
  alert: 'M12 4l9 16H3l9-16Zm0 6v4m0 3h.01',
  chevron: 'M9 6l6 6-6 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  tag: 'M3 12V4h8l9 9-8 8-9-9Zm4-5h.01',
  window: 'M3 5h18v14H3zM3 9h18',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
};

export function icon(name, { size = 18, className = 'icon' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', className);

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name] || ICONS.chevron);
  svg.appendChild(path);
  return svg;
}

/** A button with an icon, a label, and correct accessible naming. */
export function iconButton(iconName, label, onClick, { className = '', size = 18 } = {}) {
  const button = el('button', {
    className: `icon-btn ${className}`.trim(),
    attrs: { type: 'button', 'aria-label': label, title: label },
    on: { click: onClick },
  });
  button.appendChild(icon(iconName, { size }));
  return button;
}

/**
 * Favicon from Chrome's LOCAL cache.
 *
 * Deliberately not a third-party favicon service: that would mean sending every
 * saved URL to a remote server, which would break the product's core promise.
 * Requires the `favicon` permission — see docs/compliance.md.
 */
export function faviconUrl(pageUrl, size = 32) {
  try {
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', pageUrl);
    u.searchParams.set('size', String(size));
    return u.toString();
  } catch {
    return '';
  }
}

/** Trap Tab focus inside a container. Returns a release function. */
export function trapFocus(container, { onEscape } = {}) {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function handler(event) {
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = $$(selector, container).filter((n) => n.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/**
 * Trigger a file download from an extension page.
 *
 * Uses a blob URL and an anchor, which works inside an extension page WITHOUT
 * the `downloads` permission. Avoiding that permission is worth the small amount
 * of ceremony — it is one fewer thing on the install dialogue.
 */
export function downloadBlob(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = el('a', { attrs: { href: url, download: filename } });
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next turn — revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Read a File as text. Used by the import flow. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsText(file);
  });
}
