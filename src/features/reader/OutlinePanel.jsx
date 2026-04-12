import React from 'react';
import { useOutlineSync } from './useOutlineSync.js';

function renderDescendants(nodes, activeId, jumpToNode) {
  return (
    <div className="outline-subtree">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;

        return (
          <div key={node.id} className={`outline-item level-${node.level}`}>
            <button
              type="button"
              data-outline-id={node.id}
              className={`outline-link level-${node.level}${activeId === node.id ? ' is-active' : ''}`}
              onClick={() => jumpToNode(node)}
            >
              {node.text}
            </button>
            {hasChildren ? renderDescendants(node.children, activeId, jumpToNode) : null}
          </div>
        );
      })}
    </div>
  );
}

function renderGroups(groups, activeId, expandedIds, toggleChapter, jumpToNode) {
  return (
    <div className="outline-groups">
      {groups.map((group) => (
        <section key={group.id} className="outline-section">
          <div className="outline-section-label">{group.text}</div>
          <div className="outline-chapter-list">
            {group.children.map((chapter) => {
              const hasChildren = chapter.children.length > 0;
              const expanded = expandedIds.has(chapter.id);

              return (
                <div key={chapter.id} className={`outline-item level-${chapter.level}`}>
                  <div className="outline-row is-clickable chapter-row">
                    {hasChildren ? (
                      <button
                        type="button"
                        className={`outline-branch-toggle${expanded ? ' is-expanded' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleChapter(chapter.id);
                        }}
                        aria-label={expanded ? `Collapse ${chapter.text}` : `Expand ${chapter.text}`}
                      >
                        ▸
                      </button>
                    ) : (
                      <span className="outline-branch-spacer" />
                    )}
                    <button
                      type="button"
                      data-outline-id={chapter.id}
                      className={`outline-link level-${chapter.level}${activeId === chapter.id ? ' is-active' : ''}`}
                      onClick={() => jumpToNode(chapter)}
                    >
                      {chapter.text}
                    </button>
                  </div>
                  {hasChildren && expanded ? renderDescendants(chapter.children, activeId, jumpToNode) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function OutlinePanel({
  outline,
  activeId,
  collapsed,
  autoFollowLockUntil = 0,
  onDebugEvent = null,
  onToggle,
  onNavigateToHeading,
  scrollOffset,
}) {
  const { tree, navRef, expandedIds, toggleChapter, jumpToNode } = useOutlineSync({
    outline,
    activeId,
    autoFollowLockUntil,
    onDebugEvent,
    onNavigateToHeading,
    scrollOffset,
  });

  if (!tree.length) {
    return null;
  }

  return (
    <aside className={`outline-panel${collapsed ? ' is-collapsed' : ''}`}>
      <button
        type="button"
        className="outline-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show table of contents' : 'Hide table of contents'}
        title={collapsed ? 'Show table of contents' : 'Hide table of contents'}
      >
        ☰
      </button>
      {collapsed ? null : (
        <div className="outline-card">
          <nav ref={navRef} className="outline-nav">
            {renderGroups(tree, activeId, expandedIds, toggleChapter, jumpToNode)}
          </nav>
        </div>
      )}
    </aside>
  );
}
