const INITIAL_HASH_STORAGE_KEY = '__reader_initial_hash__';

function readInitialHashPayload(pathname, search) {
  try {
    const raw = window.sessionStorage.getItem(INITIAL_HASH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw);
    if (payload?.pathname !== pathname || payload?.search !== search || !payload?.hash) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function readInitialHash(pathname, search) {
  const payload = readInitialHashPayload(pathname, search);
  return payload ? decodeURIComponent(String(payload.hash).replace(/^#/, '')) : '';
}

export function consumeInitialHash(pathname, search) {
  const hashId = readInitialHash(pathname, search);
  if (hashId) {
    clearInitialHash();
  }
  return hashId;
}

export function clearInitialHash() {
  try {
    window.sessionStorage.removeItem(INITIAL_HASH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function resolveLocationHash(pathname, search, hash) {
  return decodeURIComponent(String(hash ?? '').replace(/^#/, ''))
    || readInitialHash(pathname, search);
}
