import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useActiveHeading } from './useOutlineSync.js';
import { useProgressiveDocument } from './useProgressiveDocument.js';
import { useTargetNavigation } from './useTargetNavigation.js';
import { clearSearchHighlights, highlightElementText } from './searchHighlight.js';
import { READER_SCROLL_OFFSET, SEARCH_HIGHLIGHT_DURATION_MS, SECTION_PRELOAD_MARGIN, TARGET_STABILIZATION_MS } from './constants.js';
import LazyDocumentSection from './LazyDocumentSection.jsx';
import OutlinePanel from './OutlinePanel.jsx';
import DevSectionInspector from './DevSectionInspector.jsx';
import ReaderDebugPanel from './ReaderDebugPanel.jsx';
import { useReaderDebugState } from './useReaderDebugState.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function normalizeStatus(status) {
  if (!status) {
    return 'Draft';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function MetadataPills({ document }) {
  const authorNames = Array.isArray(document.authors)
    ? document.authors.map((author) => author?.name).filter(Boolean)
    : [];

  return (
    <div className="meta-pills">
      <span className="meta-pill">{document.drId}</span>
      <span className="meta-pill">{normalizeStatus(document.status)}</span>
      {document.dateUpdated ? (
        <span className="meta-pill">Updated {formatDate(document.dateUpdated)}</span>
      ) : null}
      <span className="meta-pill">{document.lineCount.toLocaleString()} lines</span>
      {authorNames.length ? <span className="meta-pill">{authorNames.join(', ')}</span> : null}
    </div>
  );
}

export default function DocumentPage({ readerDocumentMeta, theme }) {
  const articleRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    copySnapshot,
    debugConfig,
    persistEnabled,
    recordEvent,
    setActiveHeadingId,
    setPendingTarget,
    setReaderMode,
    setSectionStats,
    snapshot,
    togglePersist,
    updateMermaidSection,
  } = useReaderDebugState({ location });
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [placeholderNavigationState, setPlaceholderNavigationState] = useState({
    active: Boolean(location.hash || location.state?.searchNavigation),
    sectionId: null,
  });

  const {
    state,
    shellDocument,
    sectionList,
    sectionMap,
    headingToSectionMap,
    sectionReadyTick,
    recordMetric,
    ensureSectionMounted,
    ensureAllSectionsMounted,
    handleSectionVisible,
    handleSectionReady,
    handleRetryChunk,
  } = useProgressiveDocument({
    readerDocumentMeta,
    prioritizedNavigationActive: placeholderNavigationState.active,
    prioritizedSectionId: placeholderNavigationState.sectionId,
    onDebugEvent: recordEvent,
  });

  const mountedHeadingIds = useMemo(
    () => sectionList
      .filter((section) => state.mountedSections[section.sectionId])
      .flatMap((section) => section.headingIds),
    [sectionList, state.mountedSections],
  );
  const activeId = useActiveHeading(mountedHeadingIds);

  const {
    pendingTarget,
    outlineAutoFollowLockUntil,
    prioritizedNavigationActive,
    prioritizedSectionId,
    handleHeadingNavigation,
  } = useTargetNavigation({
    articleRef,
    location,
    navigate,
    headingToSectionMap,
    sectionMap,
    mountedSections: state.mountedSections,
    sectionReadyTick,
    recordMetric,
    clearSearchHighlights,
    highlightElementText,
    scrollOffset: READER_SCROLL_OFFSET,
    highlightDurationMs: SEARCH_HIGHLIGHT_DURATION_MS,
    targetStabilizationMs: TARGET_STABILIZATION_MS,
    onDebugEvent: recordEvent,
  });

  const outlineActiveId = pendingTarget?.headingId ?? activeId;

  useEffect(() => {
    setPlaceholderNavigationState({
      active: prioritizedNavigationActive,
      sectionId: prioritizedSectionId,
    });
  }, [prioritizedNavigationActive, prioritizedSectionId]);

  useEffect(() => {
    setReaderMode(prioritizedNavigationActive ? 'target-first' : 'normal');
  }, [prioritizedNavigationActive, setReaderMode]);

  useEffect(() => {
    setActiveHeadingId(outlineActiveId ?? null);
    if (outlineActiveId) {
      recordEvent('outline', 'active_heading_changed', {
        activeId: outlineActiveId,
        reason: 'scroll_spy',
      });
    }
  }, [outlineActiveId, recordEvent, setActiveHeadingId]);

  useEffect(() => {
    setPendingTarget(pendingTarget
      ? {
          sectionId: pendingTarget.sectionId,
          headingId: pendingTarget.headingId,
          targetId: pendingTarget.targetId,
          chunkId: pendingTarget.chunkId,
        }
      : null);
  }, [pendingTarget, setPendingTarget]);

  useEffect(() => {
    const totalChunks = (shellDocument?.renderManifest?.chunks?.length ?? 0)
      + ((shellDocument?.inlineSectionIds?.length ?? 0) ? 1 : 0);
    setSectionStats({
      mounted: Object.keys(state.mountedSections).length,
      total: sectionList.length,
      loadedChunks: Object.keys(state.loadedChunks).length,
      totalChunks,
      chunkErrors: Object.values(state.chunkErrors).filter(Boolean).length,
    });
  }, [
    sectionList.length,
    setSectionStats,
    shellDocument?.inlineSectionIds?.length,
    shellDocument?.renderManifest?.chunks?.length,
    state.chunkErrors,
    state.loadedChunks,
    state.mountedSections,
  ]);

  useEffect(() => {
    if (!pendingTarget?.sectionId) {
      return;
    }

    ensureSectionMounted(pendingTarget.sectionId, 'target').catch(() => {});
  }, [ensureSectionMounted, pendingTarget]);

  useEffect(() => {
    const handleBeforePrint = () => {
      ensureAllSectionsMounted();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [ensureAllSectionsMounted]);

  if (state.loading) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>{readerDocumentMeta.title}</h1>
          <p>Loading document shell…</p>
        </div>
      </section>
    );
  }

  if (state.error || !shellDocument) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>Document failed to load</h1>
          <p>{String(state.error)}</p>
        </div>
      </section>
    );
  }

  const heroSummary = shellDocument.summary;

  return (
    <section className="doc-page-shell">
      <div className="doc-page-topbar">
        <Link to="/" className="doc-index-link">Deep Research Library</Link>
      </div>

      <section className={`doc-view${outlineCollapsed ? ' outline-hidden' : ''}`}>
        <div className="doc-main">
          <header className="doc-hero">
            <Link to="/" className="back-link">
              ← All documents
            </Link>
            <MetadataPills document={shellDocument} />
            <div className="doc-hero-copy">
              <h1>{shellDocument.title}</h1>
            </div>
            {heroSummary ? (
              <aside className="doc-hero-summary">
                <div className="doc-hero-summary-label">Document Brief</div>
                <p className="doc-summary">{heroSummary}</p>
              </aside>
            ) : null}
          </header>

          <article ref={articleRef} className="doc-article">
            {sectionList.map((section) => (
              <LazyDocumentSection
                key={section.sectionId}
                section={section}
                html={state.mountedSections[section.sectionId] ?? null}
                error={state.chunkErrors[section.chunkId] ?? null}
                onVisible={handleSectionVisible}
                onRetry={handleRetryChunk}
                onReady={handleSectionReady}
                onDebugEvent={recordEvent}
                onMermaidState={updateMermaidSection}
                theme={theme}
                preloadMargin={SECTION_PRELOAD_MARGIN}
              />
            ))}
          </article>
        </div>

        <OutlinePanel
          outline={shellDocument.outline}
          activeId={outlineActiveId}
          collapsed={outlineCollapsed}
          autoFollowLockUntil={outlineAutoFollowLockUntil}
          onDebugEvent={recordEvent}
          onToggle={() => setOutlineCollapsed((current) => !current)}
          onNavigateToHeading={handleHeadingNavigation}
          scrollOffset={READER_SCROLL_OFFSET}
        />
      </section>
      <DevSectionInspector
        articleRef={articleRef}
        sectionList={sectionList}
        mountedSections={state.mountedSections}
        chunkErrors={state.chunkErrors}
        pendingTarget={pendingTarget}
        sectionReadyTick={sectionReadyTick}
      />
      {debugConfig.enabled ? (
        <div
          hidden
          aria-hidden="true"
          data-reader-debug="state"
          data-debug-schema-version={snapshot.schemaVersion}
          data-debug-route={snapshot.route.pathname + snapshot.route.hash}
          data-debug-scopes={snapshot.scopes.join(',')}
          data-debug-ui-mode={snapshot.uiMode}
          data-debug-reader-mode={snapshot.readerMode}
          data-debug-mounted-sections={snapshot.sections.mounted}
          data-debug-total-sections={snapshot.sections.total}
          data-debug-loaded-chunks={snapshot.sections.loadedChunks}
          data-debug-total-chunks={snapshot.sections.totalChunks}
          data-debug-chunk-errors={snapshot.sections.chunkErrors}
          data-debug-pending-target={
            snapshot.pendingTarget?.headingId
            ?? snapshot.pendingTarget?.targetId
            ?? snapshot.pendingTarget?.sectionId
            ?? ''
          }
          data-debug-active-heading={snapshot.activeHeadingId ?? ''}
          data-debug-mermaid-svg-count={snapshot.mermaid.renderedSvgCount}
          data-debug-mermaid-fallback-count={snapshot.mermaid.fallbackCount}
          data-debug-last-event={snapshot.lastEvent ? `${snapshot.lastEvent.scope}:${snapshot.lastEvent.event}` : ''}
        />
      ) : null}
      {debugConfig.enabled && debugConfig.uiMode === 'panel' ? (
        <ReaderDebugPanel
          snapshot={snapshot}
          debugConfig={debugConfig}
          persistEnabled={persistEnabled}
          onTogglePersist={togglePersist}
          onCopy={copySnapshot}
        />
      ) : null}
    </section>
  );
}
