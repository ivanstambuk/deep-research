import React, { useEffect, useRef } from 'react';
import { assertMermaidSectionRendered, renderMermaid } from './mermaid.js';

const LazyDocumentSection = React.memo(function LazyDocumentSection({
  section,
  html,
  error,
  onVisible,
  onRetry,
  onReady,
  theme,
  preloadMargin,
}) {
  const ref = useRef(null);
  const onVisibleRef = useRef(onVisible);
  const onRetryRef = useRef(onRetry);
  const onReadyRef = useRef(onReady);

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

    let cancelled = false;

    const finish = () => {
      if (!cancelled) {
        onReadyRef.current(section.sectionId);
      }
    };

    if (section.containsMermaid) {
      renderMermaid(ref.current)
        .catch((nextError) => {
          console.error('Mermaid render failed', nextError);
        })
        .finally(() => {
          assertMermaidSectionRendered(section.sectionId, ref.current);
          finish();
        });
    } else {
      finish();
    }

    return () => {
      cancelled = true;
    };
  }, [html, section.containsMermaid, section.sectionId, theme]);

  return (
    <section
      ref={ref}
      className={`doc-section-slot${html ? ' is-mounted' : ''}${error ? ' has-error' : ''}`}
      data-section-id={section.sectionId}
      data-chunk-id={section.chunkId ?? 'shell'}
      data-primary-heading-id={section.primaryHeadingId ?? undefined}
      style={html
        ? {
            contentVisibility: 'auto',
            containIntrinsicSize: `auto ${section.estimatedHeight}px`,
          }
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
  prevProps.theme === nextProps.theme &&
  prevProps.preloadMargin === nextProps.preloadMargin
));

export default LazyDocumentSection;
