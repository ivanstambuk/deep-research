/**
 * Reader debug mode usage:
 * - ?debug=reader
 * - ?debug=reader,target_navigation,mermaid&debug_ui=panel
 * - ?debug=all&debug_ui=log
 * - ?debug=off
 *
 * Resolution order:
 * 1. URL query params
 * 2. localStorage persisted scopes
 * 3. default off
 *
 * Recommended bug-sharing URL for document routes:
 * ?debug=reader,target_navigation,mermaid&debug_ui=panel
 */
const DEBUG_STORAGE_KEY = 'reader-debug-scopes';
export const READER_DEBUG_SCHEMA_VERSION = 1;

const KNOWN_SCOPES = [
  'reader',
  'shell',
  'chunk',
  'target_navigation',
  'outline',
  'mermaid',
];

const SCOPE_ALIASES = {
  nav: 'target_navigation',
  navigation: 'target_navigation',
  target: 'target_navigation',
  toc: 'outline',
};

function normalizeScopeToken(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) {
    return null;
  }

  return SCOPE_ALIASES[normalized] ?? normalized;
}

export function getKnownReaderDebugScopes() {
  return [...KNOWN_SCOPES];
}

export function parseReaderDebugScopes(rawValue) {
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
  pathname,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
} = {}) {
  const params = new URLSearchParams(
    search ?? (typeof window !== 'undefined' ? window.location.search : ''),
  );
  const routePath = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const rawDebug = params.get('debug');
  const rawDebugUi = params.get('debug_ui');
  const storedDebug = rawDebug == null ? storage?.getItem(DEBUG_STORAGE_KEY) : null;

  const source = rawDebug != null
    ? 'url'
    : storedDebug != null
      ? 'storage'
      : 'default';

  const scopes = parseReaderDebugScopes(rawDebug ?? storedDebug ?? '');
  const enabled = scopes.length > 0 && !scopes.includes('off');

  let uiMode = normalizeScopeToken(rawDebugUi);
  if (!['panel', 'log', 'off'].includes(uiMode)) {
    uiMode = enabled
      ? (routePath === '/' ? 'log' : 'panel')
      : 'off';
  }

  return {
    source,
    scopes,
    enabled,
    uiMode,
  };
}

export function createEmptyReaderDebugSnapshot({
  pathname = '/',
  hash = '',
  scopes = [],
  uiMode = 'off',
} = {}) {
  return {
    schemaVersion: READER_DEBUG_SCHEMA_VERSION,
    route: {
      pathname,
      hash,
    },
    scopes,
    uiMode,
    readerMode: 'normal',
    activeHeadingId: null,
    pendingTarget: null,
    sections: {
      mounted: 0,
      total: 0,
      loadedChunks: 0,
      totalChunks: 0,
      chunkErrors: 0,
    },
    mermaid: {
      visibleSections: 0,
      renderedSvgCount: 0,
      fallbackCount: 0,
      failedCount: 0,
    },
    lastEvent: null,
  };
}

export function isDebugEnabled(config, scope = 'reader') {
  if (!config?.enabled) {
    return false;
  }

  const normalizedScope = normalizeScopeToken(scope) ?? 'reader';
  if (config.scopes.includes('all')) {
    return true;
  }

  if (normalizedScope === 'reader') {
    return config.scopes.length > 0 && !config.scopes.includes('off');
  }

  return config.scopes.includes('reader') || config.scopes.includes(normalizedScope);
}

export function debugLog(config, scope, event, payload = {}) {
  const normalizedScope = normalizeScopeToken(scope) ?? 'reader';
  if (!isDebugEnabled(config, normalizedScope)) {
    return;
  }

  console.debug(`[reader:${normalizedScope}] ${event}`, payload);
}

export function getCurrentReaderDebugConfig() {
  return resolveReaderDebugConfig();
}

export function getReaderDebugStorageKey() {
  return DEBUG_STORAGE_KEY;
}

export function persistReaderDebugScopes(value, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) {
    return;
  }

  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    storage.removeItem(DEBUG_STORAGE_KEY);
    return;
  }

  storage.setItem(DEBUG_STORAGE_KEY, trimmed);
}

export function serializeReaderDebugSnapshot(snapshot) {
  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    route: snapshot.route,
    scopes: snapshot.scopes,
    uiMode: snapshot.uiMode,
    readerMode: snapshot.readerMode,
    activeHeadingId: snapshot.activeHeadingId,
    pendingTarget: snapshot.pendingTarget
      ? {
          sectionId: snapshot.pendingTarget.sectionId ?? null,
          headingId: snapshot.pendingTarget.headingId ?? null,
          targetId: snapshot.pendingTarget.targetId ?? null,
          chunkId: snapshot.pendingTarget.chunkId ?? null,
        }
      : null,
    sections: snapshot.sections,
    mermaid: snapshot.mermaid,
    lastEvent: snapshot.lastEvent
      ? {
          scope: snapshot.lastEvent.scope,
          event: snapshot.lastEvent.event,
          ts: snapshot.lastEvent.ts,
        }
      : null,
  }, null, 2);
}
