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
  });

  const outlineActiveId = pendingTarget?.headingId ?? activeId;

  useEffect(() => {
    setPlaceholderNavigationState({
      active: prioritizedNavigationActive,
      sectionId: prioritizedSectionId,
    });
  }, [prioritizedNavigationActive, prioritizedSectionId]);

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
    </section>
  );
}
