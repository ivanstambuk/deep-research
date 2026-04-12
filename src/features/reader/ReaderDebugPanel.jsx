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
  const liveRouteHash = typeof window !== 'undefined'
    ? (window.location.hash || snapshot.route.hash)
    : snapshot.route.hash;

  const summary = useMemo(() => ({
    route: `${snapshot.route.pathname}${liveRouteHash}`,
    mounted: `${snapshot.sections.mounted}/${snapshot.sections.total}`,
    chunks: `${snapshot.sections.loadedChunks}/${snapshot.sections.totalChunks}`,
    mermaid: `${snapshot.mermaid.renderedSvgCount} svg / ${snapshot.mermaid.fallbackCount} fallback`,
    target: snapshot.navigation.resolvedTarget?.headingId
      ?? snapshot.navigation.resolvedTarget?.targetId
      ?? snapshot.navigation.resolvedTarget?.sectionId
      ?? snapshot.pendingTarget?.headingId
      ?? snapshot.pendingTarget?.targetId
      ?? snapshot.pendingTarget?.sectionId
      ?? 'none',
  }), [liveRouteHash, snapshot]);

  return (
    <aside
      className={`reader-debug-panel${collapsed ? ' is-collapsed' : ''}`}
      data-reader-debug="panel"
      data-debug-schema-version={snapshot.schemaVersion}
      data-debug-route={summary.route}
      data-debug-scopes={snapshot.scopes.join(',')}
      data-debug-ui-mode={snapshot.uiMode}
      data-debug-reader-mode={snapshot.readerMode}
      data-debug-navigation-phase={snapshot.navigation.phase}
      data-debug-navigation-mode={snapshot.navigation.navigationMode}
      data-debug-reveal-mode={snapshot.navigation.revealMode}
      data-debug-target-content-class={snapshot.navigation.targetContentClass ?? snapshot.navigation.resolvedTarget?.contentClass ?? 'plain'}
      data-debug-toc-owner={snapshot.navigation.tocOwner}
      data-debug-scroll-owner={snapshot.navigation.scrollOwner}
      data-debug-early-reveal-count={snapshot.navigation.earlyRevealCount ?? 0}
      data-debug-early-toc-transfer-count={snapshot.navigation.earlyTocTransferCount ?? 0}
      data-debug-multi-jump-count={snapshot.navigation.multiJumpCount ?? 0}
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
      data-debug-navigation-event-count={snapshot.navigationEvents?.length ?? 0}
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
            <div><strong>Navigation phase</strong><span>{snapshot.navigation.phase}</span></div>
            <div><strong>Navigation mode</strong><span>{snapshot.navigation.navigationMode}</span></div>
            <div><strong>Active heading</strong><span>{snapshot.activeHeadingId ?? 'none'}</span></div>
            <div><strong>Pending target</strong><span>{summary.target}</span></div>
            <div><strong>Target ready</strong><span>{String(snapshot.navigation.targetReady)}</span></div>
            <div><strong>Target stable</strong><span>{String(snapshot.navigation.targetStable)}</span></div>
            <div><strong>Target class</strong><span>{snapshot.navigation.targetContentClass ?? snapshot.navigation.resolvedTarget?.contentClass ?? 'plain'}</span></div>
            <div><strong>Reveal mode</strong><span>{snapshot.navigation.revealMode}</span></div>
            <div><strong>TOC owner</strong><span>{snapshot.navigation.tocOwner}</span></div>
            <div><strong>Scroll owner</strong><span>{snapshot.navigation.scrollOwner}</span></div>
            <div><strong>Scroll commands</strong><span>{snapshot.navigation.scrollCommandCount}</span></div>
            <div><strong>Early reveal count</strong><span>{snapshot.navigation.earlyRevealCount ?? 0}</span></div>
            <div><strong>Early TOC transfer</strong><span>{snapshot.navigation.earlyTocTransferCount ?? 0}</span></div>
            <div><strong>Multi-jump count</strong><span>{snapshot.navigation.multiJumpCount ?? 0}</span></div>
            <div><strong>Mounted sections</strong><span>{summary.mounted}</span></div>
            <div><strong>Loaded chunks</strong><span>{summary.chunks}</span></div>
            <div><strong>Chunk errors</strong><span>{snapshot.sections.chunkErrors}</span></div>
            <div><strong>Mermaid</strong><span>{summary.mermaid}</span></div>
            <div><strong>Last event</strong><span>{snapshot.lastEvent ? `${snapshot.lastEvent.scope}:${snapshot.lastEvent.event}` : 'none'}</span></div>
            <div><strong>Event time</strong><span>{formatTimestamp(snapshot.lastEvent?.ts)}</span></div>
            <div><strong>Nav events</strong><span>{snapshot.navigationEvents?.length ?? 0}</span></div>
          </div>

          {snapshot.navigationEvents?.length ? (
            <div className="reader-debug-event-log">
              <strong>Recent target-navigation events</strong>
              <ol>
                {snapshot.navigationEvents.slice().reverse().map((entry) => {
                  const target = entry.payload?.headingId ?? entry.payload?.targetId ?? entry.payload?.sectionId ?? 'none';
                  return (
                    <li key={`${entry.ts}-${entry.event}`}>
                      <span>{formatTimestamp(entry.ts)}</span>
                      <span>{entry.event}</span>
                      <span>{target}</span>
                      <span>{entry.payload?.phase ?? entry.payload?.navigationMode ?? 'none'}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

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
