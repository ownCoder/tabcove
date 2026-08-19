/**
 * Tabcove — toasts.
 *
 * The undo toast is not decoration; it is the product's third durability layer,
 * sitting in front of restore points and the bin. Every destructive action
 * returns an inverse operation and this is where the user gets to run it.
 *
 * Accessibility notes that matter here:
 *   - the container is aria-live="polite", so screen readers announce results
 *     without stealing focus;
 *   - a toast carrying an undo lasts 10 s, not 4, because 4 s is not enough time
 *     to read a sentence and decide;
 *   - the timer pauses on hover AND on focus, so a keyboard user tabbing to the
 *     undo button does not lose it mid-reach.
 */

import { el, icon } from './dom.js';
import { UNDO_WINDOW_MS } from './constants.js';

let container = null;
const active = new Set();
const MAX_VISIBLE = 3;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = el('div', {
    className: 'toast-stack',
    attrs: { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' },
  });
  document.body.appendChild(container);
  return container;
}

/**
 * Show a toast.
 *
 * @param {string} message
 * @param {Object} options
 *   - variant   'info' | 'success' | 'warn' | 'error'
 *   - detail    a muted second line
 *   - action    { label, onClick } — usually Undo
 *   - duration  ms; defaults to 10 s with an action, 4.5 s without
 * @returns {{dismiss: Function}}
 */
export function toast(message, options = {}) {
  const {
    variant = 'info',
    detail = null,
    action = null,
    duration = action ? UNDO_WINDOW_MS : 4500,
  } = options;

  const stack = ensureContainer();

  // Keep the stack short. Oldest goes first — it has had the most reading time.
  while (active.size >= MAX_VISIBLE) {
    const oldest = active.values().next().value;
    if (!oldest) break;
    oldest.dismiss();
  }

  const iconName =
    variant === 'success'
      ? 'check'
      : variant === 'error' || variant === 'warn'
        ? 'alert'
        : 'clock';

  const node = el('div', {
    className: `toast toast--${variant}`,
    attrs: { role: variant === 'error' ? 'alert' : undefined },
  });

  node.appendChild(icon(iconName, { size: 18, className: 'toast__icon' }));

  const body = el('div', { className: 'toast__body' }, [
    el('div', { className: 'toast__message', text: message }),
    detail ? el('div', { className: 'toast__detail', text: detail }) : null,
  ]);
  node.appendChild(body);

  const handle = {
    dismiss() {
      clearTimeout(timer);
      active.delete(handle);
      node.classList.add('toast--leaving');
      // Match the CSS exit duration, then remove.
      setTimeout(() => node.remove(), 140);
    },
  };

  if (action) {
    node.appendChild(
      el('button', {
        className: 'toast__action',
        text: action.label || 'Undo',
        attrs: { type: 'button' },
        on: {
          click: async () => {
            handle.dismiss();
            try {
              await action.onClick();
            } catch (e) {
              toast('That could not be undone.', { variant: 'error', detail: e.message });
            }
          },
        },
      })
    );
  }

  const closeButton = el('button', {
    className: 'toast__close',
    attrs: { type: 'button', 'aria-label': 'Dismiss' },
    on: { click: () => handle.dismiss() },
  });
  closeButton.appendChild(icon('close', { size: 14 }));
  node.appendChild(closeButton);

  stack.appendChild(node);
  active.add(handle);

  // Pause on hover and on focus — a keyboard user must not lose the undo button
  // while reaching for it.
  let remaining = duration;
  let startedAt = Date.now();
  let timer = setTimeout(() => handle.dismiss(), remaining);

  const pause = () => {
    clearTimeout(timer);
    remaining -= Date.now() - startedAt;
  };
  const resume = () => {
    startedAt = Date.now();
    timer = setTimeout(() => handle.dismiss(), Math.max(1200, remaining));
  };

  node.addEventListener('mouseenter', pause);
  node.addEventListener('mouseleave', resume);
  node.addEventListener('focusin', pause);
  node.addEventListener('focusout', resume);

  return handle;
}

export const success = (msg, opts = {}) => toast(msg, { ...opts, variant: 'success' });
export const warn = (msg, opts = {}) => toast(msg, { ...opts, variant: 'warn' });
export const error = (msg, opts = {}) => toast(msg, { ...opts, variant: 'error' });

/**
 * Wrap an async action so any thrown error becomes a readable toast rather than
 * an unhandled rejection in a console the user will never open.
 */
export async function guard(fn, fallbackMessage = 'That did not work.') {
  try {
    return await fn();
  } catch (e) {
    error(e?.quota ? 'Not enough room to save.' : fallbackMessage, {
      detail: e?.message || String(e),
    });
    return null;
  }
}
