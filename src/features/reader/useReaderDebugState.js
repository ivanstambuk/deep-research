import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createEmptyNavigationDebugState,
  createEmptyReaderDebugSnapshot,
  getReaderDebugStorageKey,
  persistReaderDebugScopes,
  resolveReaderDebugConfig,
  serializeReaderDebugSnapshot,
} from './debug.js';

function getLiveRouteHash(fallbackHash = '') {
  if (typeof window === 'undefined') {
    return fallbackHash;
  }

  return window.location.hash || fallbackHash;
}

function createLastEvent(scope, event, payload = {}) {
  return {
    scope,
    event,
    ts: Date.now(),
    payload,
  };
}

export function useReaderDebugState({ location }) {
  const debugConfig = useMemo(() => resolveReaderDebugConfig({
    search: location.search,
    pathname: location.pathname,
  }), [location.pathname, location.search]);
  const [snapshot, setSnapshot] = useState(() => ({
    ...createEmptyReaderDebugSnapshot({
      pathname: location.pathname,
      hash: getLiveRouteHash(location.hash),
      scopes: debugConfig.scopes,
      uiMode: debugConfig.uiMode,
    }),
  }));
  const [mermaidBySection, setMermaidBySection] = useState({});
  const [persistEnabled, setPersistEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(window.localStorage.getItem(getReaderDebugStorageKey()));
  });

  useEffect(() => {
    setSnapshot((current) => ({
      ...current,
      route: {
        pathname: location.pathname,
        hash: getLiveRouteHash(location.hash),
      },
      scopes: debugConfig.scopes,
      uiMode: debugConfig.uiMode,
    }));
  }, [debugConfig.scopes, debugConfig.uiMode, location.hash, location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setPersistEnabled(Boolean(window.localStorage.getItem(getReaderDebugStorageKey())));
  }, [debugConfig.source]);

  const recordEvent = useCallback((scope, event, payload = {}) => {
    if (!debugConfig.enabled) {
      return;
    }

    setSnapshot((current) => ({
      ...current,
      lastEvent: createLastEvent(scope, event, payload),
    }));
  }, [debugConfig.enabled]);

  const setReaderMode = useCallback((readerMode) => {
    if (!debugConfig.enabled) {
      return;
    }

    setSnapshot((current) => ({
      ...current,
      readerMode,
    }));
  }, [debugConfig.enabled]);

  const setActiveHeadingId = useCallback((activeHeadingId) => {
    if (!debugConfig.enabled) {
      return;
    }

    setSnapshot((current) => ({
      ...current,
      activeHeadingId,
    }));
  }, [debugConfig.enabled]);

  const setPendingTarget = useCallback((pendingTarget) => {
    if (!debugConfig.enabled) {
      return;
    }

    setSnapshot((current) => ({
      ...current,
      pendingTarget,
    }));
  }, [debugConfig.enabled]);

  const setNavigationState = useCallback((navigation) => {
    if (!debugConfig.enabled) {
      return;
    }

    setSnapshot((current) => ({
      ...current,
      navigation: {
        ...createEmptyNavigationDebugState(),
        ...navigation,
      },
    }));
  }, [debugConfig.enabled]);

  const setSectionStats = useCallback((sections) => {
    if (!debugConfig.enabled) {
      return;
    }

    setSnapshot((current) => ({
      ...current,
      sections,
    }));
  }, [debugConfig.enabled]);

  const updateMermaidSection = useCallback((sectionId, nextState) => {
    if (!debugConfig.enabled || !sectionId) {
      return;
    }

    setMermaidBySection((current) => ({
      ...current,
      [sectionId]: nextState,
    }));
  }, [debugConfig.enabled]);

  const togglePersist = useCallback((enabled) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (enabled) {
      persistReaderDebugScopes(debugConfig.scopes.join(','));
    } else {
      persistReaderDebugScopes('');
    }
    setPersistEnabled(enabled);
  }, [debugConfig.scopes]);

  const copySnapshot = useCallback(async () => {
    const payload = serializeReaderDebugSnapshot(snapshot);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        console.debug('[reader:debug] snapshot', payload);
      }
    } catch {
      console.debug('[reader:debug] snapshot', payload);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!debugConfig.enabled) {
      return;
    }

    const states = Object.values(mermaidBySection);
    const mermaid = {
      visibleSections: states.filter((item) => item?.visible).length,
      renderedSvgCount: states.reduce((sum, item) => sum + (item?.renderedSvgCount ?? 0), 0),
      fallbackCount: states.reduce((sum, item) => sum + (item?.fallbackCount ?? 0), 0),
      failedCount: states.reduce((sum, item) => sum + (item?.failed ? 1 : 0), 0),
    };

    setSnapshot((current) => ({
      ...current,
      mermaid,
    }));
  }, [debugConfig.enabled, mermaidBySection]);

  return {
    debugConfig,
    persistEnabled,
    snapshot,
    copySnapshot,
    recordEvent,
    setReaderMode,
    setActiveHeadingId,
    setPendingTarget,
    setNavigationState,
    setSectionStats,
    togglePersist,
    updateMermaidSection,
  };
}
