import React, { useEffect, useRef } from 'react';
import { assertMermaidSectionRendered, renderMermaid } from './mermaid.js';

const LazyDocumentSection = React.memo(function LazyDocumentSection({
  section,
  html,
  error,
  isTargetSection = false,
  forceLayout = false,
  targetReady = false,
  targetStable = false,
  onVisible,
  onRetry,
  onReady,
  onDebugEvent,
  onMermaidState,
  theme,
  preloadMargin,
}) {
  const ref = useRef(null);
  const measuredHeightRef = useRef(section.estimatedHeight);
  const onVisibleRef = useRef(onVisible);
  const onRetryRef = useRef(onRetry);
  const onReadyRef = useRef(onReady);
  const sectionHeavy = section.contentClass ?? (section.containsMermaid ? 'mermaid' : 'plain');

  useEffect(() => {
    onVisibleRef.current = onVisible;
    onRetryRef.current = onRetry;
    onReadyRef.current = onReady;
  }, [onReady, onRetry, onVisible]);

  useEffect(() => {
    if (html || error || !ref.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisibleRef.current(section.sectionId, 'viewport');
        }
      },
      { rootMargin: preloadMargin },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [error, html, preloadMargin, section.sectionId]);

  useEffect(() => {
    if (!html || !ref.current) {
      return undefined;
    }

    const syncMeasuredHeight = () => {
      const nextHeight = Math.round(ref.current?.getBoundingClientRect().height ?? 0);
      if (nextHeight > 0) {
        measuredHeightRef.current = nextHeight;
      }
    };

    let cancelled = false;

    const finish = () => {
      if (!cancelled) {
        syncMeasuredHeight();
        onReadyRef.current(section.sectionId);
      }
    };

    syncMeasuredHeight();

    if (section.containsMermaid) {
      renderMermaid(ref.current, {
        onDebugEvent,
        sectionId: section.sectionId,
        priority: isTargetSection ? 'target' : 'normal',
      })
        .catch((nextError) => {
          console.error('Mermaid render failed', nextError);
        })
        .finally(() => {
          assertMermaidSectionRendered(section.sectionId, ref.current);
          const mermaidNodes = Array.from(ref.current?.querySelectorAll('.mermaid') ?? []);
          const renderedSvgCount = mermaidNodes.reduce(
            (count, node) => count + node.querySelectorAll('svg').length,
            0,
          );
          const fallbackCount = mermaidNodes.filter(
            (node) => !node.querySelector('svg') && (node.textContent ?? '').trim().length > 0,
          ).length;
          onMermaidState?.(section.sectionId, {
            visible: true,
            renderedSvgCount,
            fallbackCount,
            failed: fallbackCount > 0 && renderedSvgCount === 0,
          });
          finish();
        });
    } else {
      finish();
    }

    return () => {
      cancelled = true;
    };
  }, [html, isTargetSection, onDebugEvent, onMermaidState, section.containsMermaid, section.sectionId, theme]);

  return (
    <section
      ref={ref}
      className={`doc-section-slot${html ? ' is-mounted' : ''}${error ? ' has-error' : ''}`}
      data-section-id={section.sectionId}
      data-chunk-id={section.chunkId ?? 'shell'}
      data-render-order={section.renderOrder ?? undefined}
      data-primary-heading-id={section.primaryHeadingId ?? undefined}
      data-reader-section-id={section.sectionId}
      data-reader-section-mounted={html ? 'true' : 'false'}
      data-reader-section-heavy={sectionHeavy}
      data-reader-layout-forced={forceLayout ? 'true' : 'false'}
      data-reader-section-target={isTargetSection ? 'true' : 'false'}
      data-reader-section-ready={targetReady ? 'true' : 'false'}
      data-reader-section-stable={targetStable ? 'true' : 'false'}
      style={html
        ? (
            (isTargetSection || forceLayout)
              ? undefined
              : {
                  contentVisibility: 'auto',
                  containIntrinsicSize: `auto ${measuredHeightRef.current}px`,
                }
          )
        : {
            minHeight: `${section.estimatedHeight}px`,
          }}
    >
      {html ? (
        <div className="doc-section-inner" dangerouslySetInnerHTML={{ __html: html }} />
      ) : error ? (
        <div className="doc-section-error">
          <div className="doc-section-error-title">Section failed to load</div>
          <p>{error}</p>
          <button type="button" onClick={() => onRetryRef.current(section.chunkId)}>
            Retry section
          </button>
        </div>
      ) : (
        <div className="doc-section-placeholder">
          <div className="doc-section-placeholder-bar is-wide" />
          <div className="doc-section-placeholder-bar" />
          <div className="doc-section-placeholder-bar is-short" />
        </div>
      )}
    </section>
  );
}, (prevProps, nextProps) => (
  prevProps.section.sectionId === nextProps.section.sectionId &&
  prevProps.section.chunkId === nextProps.section.chunkId &&
  prevProps.section.containsMermaid === nextProps.section.containsMermaid &&
  prevProps.section.estimatedHeight === nextProps.section.estimatedHeight &&
  prevProps.html === nextProps.html &&
  prevProps.error === nextProps.error &&
  prevProps.isTargetSection === nextProps.isTargetSection &&
  prevProps.forceLayout === nextProps.forceLayout &&
  prevProps.targetReady === nextProps.targetReady &&
  prevProps.targetStable === nextProps.targetStable &&
  prevProps.onDebugEvent === nextProps.onDebugEvent &&
  prevProps.onMermaidState === nextProps.onMermaidState &&
  prevProps.theme === nextProps.theme &&
  prevProps.preloadMargin === nextProps.preloadMargin
));

export default LazyDocumentSection;
