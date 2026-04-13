const DEBUG_STORAGE_KEY = 'reader-debug-scopes';
const KNOWN_SCOPES = ['reader', 'mermaid'];

function normalizeScopeToken(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return normalized || null;
}

function parseReaderDebugScopes(rawValue) {
  const scopes = new Set();

  String(rawValue ?? '')
    .split(',')
    .map((token) => normalizeScopeToken(token))
    .filter(Boolean)
    .forEach((token) => {
      if (token === 'off') {
        scopes.clear();
        scopes.add('off');
        return;
      }

      if (scopes.has('off')) {
        return;
      }

      if (token === 'all' || KNOWN_SCOPES.includes(token)) {
        scopes.add(token);
      }
    });

  return Array.from(scopes);
}

export function resolveReaderDebugConfig({
  search,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
} = {}) {
  const params = new URLSearchParams(
    search ?? (typeof window !== 'undefined' ? window.location.search : ''),
  );
  const rawDebug = params.get('debug');
  const storedDebug = rawDebug == null ? storage?.getItem(DEBUG_STORAGE_KEY) : null;
  const scopes = parseReaderDebugScopes(rawDebug ?? storedDebug ?? '');

  return {
    scopes,
    enabled: scopes.length > 0 && !scopes.includes('off'),
  };
}

function isDebugEnabled(config, scope = 'reader') {
  if (!config?.enabled) {
    return false;
  }

  const normalizedScope = normalizeScopeToken(scope) ?? 'reader';
  return (
    config.scopes.includes('all')
    || config.scopes.includes('reader')
    || config.scopes.includes(normalizedScope)
  );
}

export function debugLog(config, scope, event, payload = {}) {
  if (!isDebugEnabled(config, scope)) {
    return;
  }

  console.debug(`[reader:${scope}] ${event}`, payload);
}

export function getCurrentReaderDebugConfig() {
  return resolveReaderDebugConfig();
}
