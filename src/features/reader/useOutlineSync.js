import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scrollIntoViewWithOffset } from './scroll.js';

function buildOutlineTree(outline = []) {
  const groups = [];
  let currentGroup = null;
  let currentChapter = null;

  outline.forEach((node) => {
    if (node.level <= 2) {
      currentGroup = {
        ...node,
        children: [],
      };
      groups.push(currentGroup);
      currentChapter = null;
      return;
    }

    if (!currentGroup) {
      currentGroup = {
        id: 'outline-root',
        text: 'Overview',
        level: 2,
        children: [],
      };
      groups.push(currentGroup);
    }

    if (node.level === 3) {
      currentChapter = {
        ...node,
        children: [],
      };
      currentGroup.children.push(currentChapter);
      return;
    }

    if (currentChapter) {
      currentChapter.children.push({
        ...node,
        children: [],
      });
    }
  });

  return groups;
}

function findOutlinePath(groups, targetId) {
  if (!targetId) {
    return null;
  }

  for (const group of groups) {
    for (const chapter of group.children) {
      if (chapter.id === targetId) {
        return { groupId: group.id, chapterId: chapter.id };
      }

      if (chapter.children.some((child) => child.id === targetId)) {
        return { groupId: group.id, chapterId: chapter.id };
      }
    }
  }

  return null;
}

export function useActiveHeading(mountedHeadingIds) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!mountedHeadingIds.length) {
      setActiveId(null);
      return undefined;
    }

    const headings = mountedHeadingIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!headings.length) {
      setActiveId(null);
      return undefined;
    }

    let frame = null;

    const update = () => {
      const threshold = 180;
      let bestId = headings[0]?.id ?? null;

      for (const heading of headings) {
        const { top } = heading.getBoundingClientRect();
        if (top <= threshold) {
          bestId = heading.id;
        } else {
          break;
        }
      }

      setActiveId(bestId);
      frame = null;
    };

    const schedule = () => {
      if (frame !== null) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [mountedHeadingIds]);

  return activeId;
}

export function useOutlineSync({
  outline,
  activeId,
  autoFollowLockUntil = 0,
  onNavigateToHeading,
  scrollOffset = 0,
}) {
  const tree = useMemo(() => buildOutlineTree(outline), [outline]);
  const navRef = useRef(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  useEffect(() => {
    const path = findOutlinePath(tree, activeId);
    if (!path?.chapterId) {
      return;
    }

    setExpandedIds((current) => {
      if (current.has(path.chapterId)) {
        return current;
      }

      const next = new Set(current);
      next.add(path.chapterId);
      return next;
    });
  }, [activeId, tree]);

  useEffect(() => {
    if (!activeId || !navRef.current || Date.now() < autoFollowLockUntil) {
      return;
    }

    const activeLink = navRef.current.querySelector(`[data-outline-id="${CSS.escape(activeId)}"]`);
    if (!(activeLink instanceof HTMLElement)) {
      return;
    }

    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const isVisible = linkRect.top >= navRect.top && linkRect.bottom <= navRect.bottom;

    if (!isVisible) {
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [activeId, autoFollowLockUntil]);

  const toggleChapter = useCallback((chapterId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }, []);

  const jumpToNode = useCallback((node) => {
    onNavigateToHeading(node.id);

    const element = document.getElementById(node.id);
    if (element) {
      scrollIntoViewWithOffset(element, scrollOffset, 'auto');
    }
  }, [onNavigateToHeading, scrollOffset]);

  return {
    tree,
    navRef,
    expandedIds,
    toggleChapter,
    jumpToNode,
  };
}
