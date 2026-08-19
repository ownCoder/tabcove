/**
 * Tabcove — chrome.storage.local wrapper.
 *
 * Every storage touch in the extension goes through here. The wrapper exists for
 * three reasons:
 *
 *   1. `chrome.runtime.lastError` must be checked on every call. Doing it once,
 *      here, means no call site can forget.
 *   2. Quota failures need to become a typed, catchable error rather than a
 *      silent no-op, so the UI can show the "not enough room" recovery state.
 *   3. It gives the Node test harness a single seam to mock.
 */

/** Thrown when a write is refused. `.quota` is true when the cause was space. */
export class StorageError extends Error {
  constructor(message, { quota = false, cause = null } = {}) {
    super(message);
    this.name = 'StorageError';
    this.quota = quota;
    this.cause = cause;
  }
}

/** The chrome.storage.local area, or the injected mock under Node. */
function area() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    throw new StorageError('chrome.storage.local is unavailable');
  }
  return chrome.storage.local;
}

/**
 * Read one or many keys.
 * @param {string|string[]|null} keys  null reads the whole area.
 * @returns {Promise<Object>}
 */
export function get(keys) {
  return new Promise((resolve, reject) => {
    try {
      area().get(keys, (result) => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if (err) return reject(new StorageError(err.message));
        resolve(result || {});
      });
    } catch (e) {
      reject(e instanceof StorageError ? e : new StorageError(String(e), { cause: e }));
    }
  });
}

/** Read a single key, returning `fallback` when it is absent. */
export async function getOne(key, fallback = null) {
  const out = await get(key);
  return Object.prototype.hasOwnProperty.call(out, key) ? out[key] : fallback;
}

/**
 * Write an object of key/value pairs.
 * Throws a StorageError with `.quota === true` when the area is full, which is
 * what drives the quota recovery UI.
 */
export function set(items) {
  return new Promise((resolve, reject) => {
    try {
      area().set(items, () => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if (err) {
          const quota = /quota|QUOTA_BYTES|exceeded/i.test(err.message || '');
          return reject(
            new StorageError(
              quota
                ? 'Not enough room to save. Export and remove some collections to free space.'
                : err.message,
              { quota }
            )
          );
        }
        resolve();
      });
    } catch (e) {
      reject(e instanceof StorageError ? e : new StorageError(String(e), { cause: e }));
    }
  });
}

/** Remove one or many keys. Missing keys are not an error. */
export function remove(keys) {
  return new Promise((resolve, reject) => {
    try {
      area().remove(keys, () => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if (err) return reject(new StorageError(err.message));
        resolve();
      });
    } catch (e) {
      reject(e instanceof StorageError ? e : new StorageError(String(e), { cause: e }));
    }
  });
}

/** Wipe the whole area. Only ever called from the options page danger zone. */
export function clear() {
  return new Promise((resolve, reject) => {
    try {
      area().clear(() => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if (err) return reject(new StorageError(err.message));
        resolve();
      });
    } catch (e) {
      reject(e instanceof StorageError ? e : new StorageError(String(e), { cause: e }));
    }
  });
}

/** Bytes currently used. Returns 0 rather than throwing — this only feeds a meter. */
export function bytesInUse(keys = null) {
  return new Promise((resolve) => {
    try {
      area().getBytesInUse(keys, (bytes) => {
        if (chrome.runtime && chrome.runtime.lastError) return resolve(0);
        resolve(bytes || 0);
      });
    } catch {
      resolve(0);
    }
  });
}

/** Every key currently present. Used by db.reconcile() to find orphan records. */
export async function allKeys() {
  const everything = await get(null);
  return Object.keys(everything);
}

/**
 * Subscribe to changes in the local area.
 * Returns an unsubscribe function so pages can clean up on unload.
 */
export function onChanged(listener) {
  const wrapped = (changes, areaName) => {
    if (areaName === 'local') listener(changes);
  };
  chrome.storage.onChanged.addListener(wrapped);
  return () => chrome.storage.onChanged.removeListener(wrapped);
}
