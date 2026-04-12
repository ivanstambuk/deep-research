import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debugLog, getCurrentReaderDebugConfig } from './debug.js';

const sectionChunkLoaders = import.meta.glob('../../generated/sections/**/*.txt', { query: '?raw', import: 'default' });

function resolveChunkModulePath(modulePath) {
  if (!modulePath) {
    return null;
  }

  if (modulePath.startsWith('../../generated/')) {
    return modulePath;
  }

  if (modulePath.startsWith('./generated/')) {
    return modulePath.replace('./generated/', '../../generated/');
  }

  return modulePath;
}

function parseChunkSections(htmlText) {
  const template = document.createElement('template');
  template.innerHTML = htmlText;
  const htmlBySection = new Map();

  template.content.querySelectorAll('[data-section-id]').forEach((section) => {
    const sectionId = section.getAttribute('data-section-id');
    if (sectionId) {
      htmlBySection.set(sectionId, section.outerHTML);
    }
  });

  return htmlBySection;
}

function createMetricsRecorder(documentSlug) {
  const debugConfig = getCurrentReaderDebugConfig();

  return (name, payload = {}) => {
    const scope = name.startsWith('shell.')
      ? 'shell'
      : name.startsWith('chunk.')
        ? 'chunk'
        : name.startsWith('target_navigation.')
          ? 'target_navigation'
          : 'reader';

    debugLog(debugConfig, scope, name, {
      documentSlug,
      ...payload,
    });
  };
}

function prefersReducedPrefetch() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) {
    return false;
  }

  return connection.saveData || /2g/.test(connection.effectiveType ?? '');
}

export function useProgressiveDocument({
  readerDocumentMeta,
  prioritizedNavigationActive,
  prioritizedSectionId,
  resetScrollOnLoad = true,
  onDebugEvent = null,
}) {
  const [state, setState] = useState({
    loading: true,
    shellData: null,
    mountedSections: {},
    readySections: {},
    loadedChunks: {},
    chunkErrors: {},
    error: null,
  });
  const [sectionReadyTick, setSectionReadyTick] = useState(0);
  const inFlightChunksRef = useRef(new Map());
  const prefetchTimerRef = useRef(null);
  const performanceStartRef = useRef(0);
  const metricRecorderRef = useRef(() => {});
  const requestStatsRef = useRef({
    requestCount: 0,
    inFlight: 0,
    maxInFlight: 0,
  });

  const shellDocument = state.shellData;
  const renderManifest = shellDocument?.renderManifest;
  const sectionList = renderManifest?.sections ?? [];
  const chunkList = renderManifest?.chunks ?? [];

  const sectionMap = useMemo(
    () => new Map(sectionList.map((section) => [section.sectionId, section])),
    [sectionList],
  );
  const chunkMap = useMemo(
    () => new Map(chunkList.map((chunk) => [chunk.chunkId, chunk])),
    [chunkList],
  );
  const headingToSectionMap = useMemo(() => {
    const map = new Map();
    sectionList.forEach((section) => {
      section.headingIds.forEach((headingId) => {
        map.set(headingId, section.sectionId);
      });
    });
    return map;
  }, [sectionList]);

  const recordMetric = useCallback((name, payload = {}) => {
    metricRecorderRef.current(name, payload);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (resetScrollOnLoad) {
      window.scrollTo({ top: 0 });
    }
    performanceStartRef.current = performance.now();
    metricRecorderRef.current = createMetricsRecorder(readerDocumentMeta.slug);
    requestStatsRef.current = {
      requestCount: 0,
      inFlight: 0,
      maxInFlight: 0,
    };

    if (prefetchTimerRef.current) {
      window.clearTimeout(prefetchTimerRef.current);
    }
    inFlightChunksRef.current.forEach(({ controller }) => controller.abort());
    inFlightChunksRef.current.clear();

    async function load() {
      setState({
        loading: true,
        shellData: null,
        mountedSections: {},
        readySections: {},
        loadedChunks: {},
        chunkErrors: {},
        error: null,
      });
      setSectionReadyTick(0);

      try {
        const shellModule = await readerDocumentMeta.loadShell();
        if (cancelled) {
          return;
        }

        const nextShellData = shellModule.default ?? shellModule;
        const mountedSections = Object.fromEntries(
          (nextShellData.inlineSections ?? []).map((section) => [section.sectionId, section.html]),
        );
        const loadedChunks = nextShellData.inlineSectionIds?.length ? { shell: true } : {};

        setState({
          loading: false,
          shellData: nextShellData,
          mountedSections,
          readySections: {},
          loadedChunks,
          chunkErrors: {},
          error: null,
        });

        recordMetric('shell.loaded', {
          ms: Math.round(performance.now() - performanceStartRef.current),
          inlineSectionCount: nextShellData.inlineSectionIds?.length ?? 0,
        });
        onDebugEvent?.('shell', 'loaded', {
          ms: Math.round(performance.now() - performanceStartRef.current),
          inlineSectionCount: nextShellData.inlineSectionIds?.length ?? 0,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            shellData: null,
            mountedSections: {},
            readySections: {},
            loadedChunks: {},
            chunkErrors: {},
            error,
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (prefetchTimerRef.current) {
        window.clearTimeout(prefetchTimerRef.current);
      }
      inFlightChunksRef.current.forEach(({ controller }) => controller.abort());
      inFlightChunksRef.current.clear();
    };
  }, [onDebugEvent, readerDocumentMeta, recordMetric, resetScrollOnLoad]);

  const loadChunk = useCallback(async (chunkId, priority = 'viewport') => {
    if (!chunkId || chunkId === 'shell' || !shellDocument || state.loadedChunks[chunkId]) {
      return;
    }

    const chunkMeta = chunkMap.get(chunkId);
    if (!chunkMeta) {
      throw new Error(`Missing chunk metadata for ${chunkId}`);
    }

    const resolvedModulePath = resolveChunkModulePath(chunkMeta.modulePath);
    const chunkLoader = resolvedModulePath ? sectionChunkLoaders[resolvedModulePath] : null;
    if (!chunkLoader) {
      throw new Error(`Missing generated section payload for ${resolvedModulePath ?? chunkMeta.modulePath ?? chunkId}`);
    }

    if (priority === 'target') {
      inFlightChunksRef.current.forEach((entry, inflightChunkId) => {
        if (entry.priority === 'low' && inflightChunkId !== chunkId) {
          entry.controller.abort();
          inFlightChunksRef.current.delete(inflightChunkId);
        }
      });
    }

    if (inFlightChunksRef.current.has(chunkId)) {
      return inFlightChunksRef.current.get(chunkId).promise;
    }

    const controller = new AbortController();
    const startedAt = performance.now();
    requestStatsRef.current.requestCount += 1;
    requestStatsRef.current.inFlight += 1;
    requestStatsRef.current.maxInFlight = Math.max(
      requestStatsRef.current.maxInFlight,
      requestStatsRef.current.inFlight,
    );
    onDebugEvent?.('chunk', 'requested', {
      chunkId,
      priority,
    });

    const promise = chunkLoader()
      .then((module) => {
        if (controller.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const htmlText = typeof module === 'string' ? module : module.default;
        const htmlBySection = parseChunkSections(htmlText);
        setState((current) => {
          const nextMountedSections = { ...current.mountedSections };
          chunkMeta.sectionIds.forEach((sectionId) => {
            if (!nextMountedSections[sectionId] && htmlBySection.has(sectionId)) {
              nextMountedSections[sectionId] = htmlBySection.get(sectionId);
            }
          });

          return {
            ...current,
            mountedSections: nextMountedSections,
            loadedChunks: {
              ...current.loadedChunks,
              [chunkId]: true,
            },
            chunkErrors: {
              ...current.chunkErrors,
              [chunkId]: null,
            },
          };
        });

        recordMetric('chunk.loaded', {
          chunkId,
          priority,
          ms: Math.round(performance.now() - startedAt),
        });
        onDebugEvent?.('chunk', 'mounted', {
          chunkId,
          priority,
          ms: Math.round(performance.now() - startedAt),
        });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        setState((current) => ({
          ...current,
          chunkErrors: {
            ...current.chunkErrors,
            [chunkId]: String(error),
          },
        }));
        recordMetric('chunk.failed', {
          chunkId,
          priority,
          ms: Math.round(performance.now() - startedAt),
          error: String(error),
        });
        onDebugEvent?.('chunk', 'failed', {
          chunkId,
          priority,
          ms: Math.round(performance.now() - startedAt),
          error: String(error),
        });
        throw error;
      })
      .finally(() => {
        requestStatsRef.current.inFlight = Math.max(0, requestStatsRef.current.inFlight - 1);
        inFlightChunksRef.current.delete(chunkId);
      });

    inFlightChunksRef.current.set(chunkId, { promise, controller, priority });
    return promise;
  }, [chunkMap, onDebugEvent, recordMetric, shellDocument, state.loadedChunks]);

  const scheduleAdjacentPrefetch = useCallback((sectionId) => {
    if (prioritizedNavigationActive) {
      return;
    }

    if (prefersReducedPrefetch()) {
      recordMetric('chunk.prefetch_skipped', { reason: 'network_constraints', sectionId });
      onDebugEvent?.('chunk', 'prefetch_skipped', {
        reason: 'network_constraints',
        sectionId,
      });
      return;
    }

    const currentSection = sectionMap.get(sectionId);
    if (!currentSection) {
      return;
    }

    const nextDeferred = sectionList.find(
      (section) => section.renderOrder > currentSection.renderOrder && section.chunkId !== 'shell',
    );
    if (!nextDeferred || state.loadedChunks[nextDeferred.chunkId]) {
      return;
    }

    if (prefetchTimerRef.current) {
      window.clearTimeout(prefetchTimerRef.current);
    }

    prefetchTimerRef.current = window.setTimeout(() => {
      loadChunk(nextDeferred.chunkId, 'low').catch(() => {});
    }, 120);
  }, [loadChunk, onDebugEvent, prioritizedNavigationActive, recordMetric, sectionList, sectionMap, state.loadedChunks]);

  const ensureSectionMounted = useCallback(async (sectionId, priority = 'viewport') => {
    if (!sectionId || state.mountedSections[sectionId]) {
      return;
    }

    const section = sectionMap.get(sectionId);
    if (!section) {
      throw new Error(`Missing section metadata for ${sectionId}`);
    }

    if (section.chunkId === 'shell') {
      return;
    }

    await loadChunk(section.chunkId, priority);
  }, [loadChunk, sectionMap, state.mountedSections]);

  const prepareTarget = useCallback(async (sectionId) => {
    if (!sectionId) {
      return;
    }

    const section = sectionMap.get(sectionId);
    if (!section) {
      throw new Error(`Missing section metadata for ${sectionId}`);
    }

    onDebugEvent?.('chunk', 'prepare_target_started', {
      sectionId,
      chunkId: section.chunkId ?? 'shell',
    });

    const requiredChunkIds = Array.from(new Set(
      sectionList
        .filter((candidate) => candidate.renderOrder <= section.renderOrder)
        .map((candidate) => candidate.chunkId)
        .filter((chunkId) => chunkId && chunkId !== 'shell'),
    ));

    if (
      section.chunkId === 'shell'
      || (state.mountedSections[sectionId] && requiredChunkIds.every((chunkId) => state.loadedChunks[chunkId]))
    ) {
      onDebugEvent?.('chunk', 'prepare_target_ready', {
        sectionId,
        chunkId: section.chunkId ?? 'shell',
        source: section.chunkId === 'shell' ? 'shell' : 'mounted',
        preparedChunkCount: requiredChunkIds.length,
      });
      return;
    }

    await Promise.all(requiredChunkIds.map((chunkId) => loadChunk(chunkId, 'target')));
    onDebugEvent?.('chunk', 'prepare_target_ready', {
      sectionId,
      chunkId: section.chunkId,
      source: 'target_lane',
      preparedChunkCount: requiredChunkIds.length,
    });
  }, [loadChunk, onDebugEvent, sectionList, sectionMap, state.loadedChunks, state.mountedSections]);

  const ensureAllSectionsMounted = useCallback(async () => {
    const deferredChunkIds = Array.from(new Set(
      sectionList
        .map((section) => section.chunkId)
        .filter((chunkId) => chunkId && chunkId !== 'shell'),
    ));

    await Promise.all(deferredChunkIds.map((chunkId) => loadChunk(chunkId, 'target').catch(() => {})));
    recordMetric('print.prepare_complete', {
      chunkRequests: requestStatsRef.current.requestCount,
      maxInFlight: requestStatsRef.current.maxInFlight,
    });
    onDebugEvent?.('shell', 'print_prepare_complete', {
      chunkRequests: requestStatsRef.current.requestCount,
      maxInFlight: requestStatsRef.current.maxInFlight,
    });
  }, [loadChunk, onDebugEvent, recordMetric, sectionList]);

  const handleSectionVisible = useCallback((sectionId, reason) => {
    if (prioritizedNavigationActive) {
      if (!prioritizedSectionId || sectionId !== prioritizedSectionId) {
        onDebugEvent?.('chunk', 'viewport_mount_suppressed', {
          sectionId,
          reason,
          prioritizedSectionId,
        });
        return;
      }
    }

    ensureSectionMounted(sectionId, reason === 'viewport' ? 'viewport' : 'low').catch(() => {});
    if (reason === 'viewport' && !prioritizedNavigationActive) {
      scheduleAdjacentPrefetch(sectionId);
    }
  }, [
    ensureSectionMounted,
    prioritizedNavigationActive,
    prioritizedSectionId,
    scheduleAdjacentPrefetch,
    onDebugEvent,
  ]);

  const handleSectionReady = useCallback((sectionId) => {
    setState((current) => ({
      ...current,
      readySections: {
        ...current.readySections,
        [sectionId]: Date.now(),
      },
    }));
    setSectionReadyTick((current) => current + 1);

    const currentSection = sectionMap.get(sectionId);
    if (!currentSection) {
      return;
    }

    if (!prioritizedNavigationActive) {
      scheduleAdjacentPrefetch(sectionId);
    }

    if (Object.keys(state.mountedSections).length === 1 || shellDocument?.inlineSectionIds?.includes(sectionId)) {
      recordMetric('render.first_article_content_visible', {
        ms: Math.round(performance.now() - performanceStartRef.current),
        sectionId,
      });
    }
  }, [
    prioritizedNavigationActive,
    prioritizedSectionId,
    recordMetric,
    scheduleAdjacentPrefetch,
    sectionMap,
    shellDocument?.inlineSectionIds,
    state.mountedSections,
  ]);

  const handleRetryChunk = useCallback((chunkId) => {
    if (!chunkId) {
      return;
    }

    setState((current) => ({
      ...current,
      chunkErrors: {
        ...current.chunkErrors,
        [chunkId]: null,
      },
    }));
    loadChunk(chunkId, 'target').catch(() => {});
  }, [loadChunk]);

  return {
    state,
    shellDocument,
    sectionList,
    chunkList,
    sectionMap,
    chunkMap,
    headingToSectionMap,
    sectionReadyTick,
    recordMetric,
    ensureSectionMounted,
    prepareTarget,
    ensureAllSectionsMounted,
    handleSectionVisible,
    handleSectionReady,
    handleRetryChunk,
  };
}
