import React, { useMemo, useState } from 'react';

function getMermaidState(articleRef, sectionId, containsMermaid) {
  if (!containsMermaid) {
    return 'n/a';
  }

  const root = articleRef.current;
  if (!root) {
    return 'pending';
  }

  const sectionNode = root.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`);
  if (!sectionNode) {
    return 'missing';
  }

  const mermaidNodes = Array.from(sectionNode.querySelectorAll('.mermaid'));
  if (!mermaidNodes.length) {
    return 'missing';
  }

  if (mermaidNodes.some((node) => node.querySelector('svg'))) {
    return 'svg';
  }

  if (mermaidNodes.some((node) => (node.textContent ?? '').trim().length > 0)) {
    return 'fallback';
  }

  return 'pending';
}

export default function DevSectionInspector({
  articleRef,
  sectionList,
  mountedSections,
  chunkErrors,
  pendingTarget,
  sectionReadyTick,
}) {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  const rows = useMemo(
    () => sectionList.map((section) => ({
      sectionId: section.sectionId,
      chunkId: section.chunkId ?? 'shell',
      mounted: Boolean(mountedSections[section.sectionId]),
      error: chunkErrors[section.chunkId] ?? null,
      isTarget: pendingTarget?.sectionId === section.sectionId,
      mermaidState: getMermaidState(articleRef, section.sectionId, section.containsMermaid),
    })),
    [articleRef, chunkErrors, mountedSections, pendingTarget, sectionList, sectionReadyTick],
  );

  const mountedCount = rows.filter((row) => row.mounted).length;
  const errorCount = rows.filter((row) => row.error).length;

  return (
    <div className={`dev-section-inspector${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="dev-section-inspector-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        Sections {mountedCount}/{rows.length}
      </button>
      {open ? (
        <div className="dev-section-inspector-panel">
          <div className="dev-section-inspector-summary">
            <span>mounted {mountedCount}/{rows.length}</span>
            <span>errors {errorCount}</span>
            {pendingTarget?.sectionId ? <span>target {pendingTarget.sectionId}</span> : <span>no target</span>}
          </div>
          <div className="dev-section-inspector-table">
            {rows.map((row) => (
              <div key={row.sectionId} className={`dev-section-row${row.isTarget ? ' is-target' : ''}`}>
                <span className="dev-section-id">{row.sectionId}</span>
                <span>{row.chunkId}</span>
                <span>{row.mounted ? 'mounted' : 'deferred'}</span>
                <span>{row.mermaidState}</span>
                <span>{row.error ? 'error' : 'ok'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
