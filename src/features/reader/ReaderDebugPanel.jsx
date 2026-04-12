import React, { useMemo, useState } from 'react';

function formatTimestamp(ts) {
  if (!ts) {
    return 'none';
  }

  try {
    return new Date(ts).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'invalid';
  }
}

export default function ReaderDebugPanel({
  snapshot,
  debugConfig,
  persistEnabled,
  onTogglePersist,
  onCopy,
}) {
  const [collapsed, setCollapsed] = useState(true);

  const summary = useMemo(() => ({
    route: `${snapshot.route.pathname}${snapshot.route.hash}`,
    mounted: `${snapshot.sections.mounted}/${snapshot.sections.total}`,
    chunks: `${snapshot.sections.loadedChunks}/${snapshot.sections.totalChunks}`,
    mermaid: `${snapshot.mermaid.renderedSvgCount} svg / ${snapshot.mermaid.fallbackCount} fallback`,
    target: snapshot.pendingTarget?.headingId
      ?? snapshot.pendingTarget?.targetId
      ?? snapshot.pendingTarget?.sectionId
      ?? 'none',
  }), [snapshot]);

  return (
    <aside
      className={`reader-debug-panel${collapsed ? ' is-collapsed' : ''}`}
      data-reader-debug="panel"
      data-debug-schema-version={snapshot.schemaVersion}
      data-debug-route={summary.route}
      data-debug-scopes={snapshot.scopes.join(',')}
      data-debug-ui-mode={snapshot.uiMode}
      data-debug-reader-mode={snapshot.readerMode}
      data-debug-mounted-sections={snapshot.sections.mounted}
      data-debug-total-sections={snapshot.sections.total}
      data-debug-loaded-chunks={snapshot.sections.loadedChunks}
      data-debug-total-chunks={snapshot.sections.totalChunks}
      data-debug-chunk-errors={snapshot.sections.chunkErrors}
      data-debug-pending-target={summary.target}
      data-debug-active-heading={snapshot.activeHeadingId ?? ''}
      data-debug-mermaid-svg-count={snapshot.mermaid.renderedSvgCount}
      data-debug-mermaid-fallback-count={snapshot.mermaid.fallbackCount}
      data-debug-last-event={snapshot.lastEvent ? `${snapshot.lastEvent.scope}:${snapshot.lastEvent.event}` : ''}
    >
      <div className="reader-debug-toolbar">
        <button
          type="button"
          className="reader-debug-toggle"
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? 'Debug' : 'Hide debug'}
        </button>
        <span className="reader-debug-mode">{debugConfig.uiMode}</span>
      </div>

      {collapsed ? (
        <div className="reader-debug-summary">
          <span>{summary.route}</span>
          <span>{summary.mounted}</span>
          <span>{summary.target}</span>
        </div>
      ) : (
        <div className="reader-debug-body">
          <div className="reader-debug-grid">
            <div><strong>Route</strong><span>{summary.route}</span></div>
            <div><strong>Scopes</strong><span>{snapshot.scopes.join(', ') || 'none'}</span></div>
            <div><strong>Reader mode</strong><span>{snapshot.readerMode}</span></div>
            <div><strong>Active heading</strong><span>{snapshot.activeHeadingId ?? 'none'}</span></div>
            <div><strong>Pending target</strong><span>{summary.target}</span></div>
            <div><strong>Mounted sections</strong><span>{summary.mounted}</span></div>
            <div><strong>Loaded chunks</strong><span>{summary.chunks}</span></div>
            <div><strong>Chunk errors</strong><span>{snapshot.sections.chunkErrors}</span></div>
            <div><strong>Mermaid</strong><span>{summary.mermaid}</span></div>
            <div><strong>Last event</strong><span>{snapshot.lastEvent ? `${snapshot.lastEvent.scope}:${snapshot.lastEvent.event}` : 'none'}</span></div>
            <div><strong>Event time</strong><span>{formatTimestamp(snapshot.lastEvent?.ts)}</span></div>
          </div>

          {import.meta.env.DEV ? (
            <label className="reader-debug-persist">
              <input
                type="checkbox"
                checked={persistEnabled}
                onChange={(event) => onTogglePersist(event.target.checked)}
              />
              <span>Persist scopes</span>
            </label>
          ) : null}

          <div className="reader-debug-actions">
            <button type="button" onClick={onCopy}>Copy debug state</button>
          </div>
        </div>
      )}
    </aside>
  );
}
