import { useCallback, useEffect, useRef, useState } from 'react';
import { scrollIntoViewWithOffset } from './scroll.js';

function buildNavigationTarget(location, headingToSectionMap, sectionMap) {
  const navigationState = location.state?.searchNavigation;
  const hashId = decodeURIComponent(location.hash.replace(/^#/, ''));

  if (navigationState) {
    const sectionId = navigationState.sectionId
      ?? (navigationState.headingId ? headingToSectionMap.get(navigationState.headingId) : null)
      ?? null;
    return {
      type: 'search',
      sectionId,
      chunkId: navigationState.chunkId ?? sectionMap.get(sectionId)?.chunkId ?? null,
      headingId: navigationState.headingId ?? null,
      targetId: navigationState.targetId ?? null,
      term: navigationState.term ?? '',
    };
  }

  if (hashId) {
    const sectionId = headingToSectionMap.get(hashId) ?? null;
    return {
      type: 'hash',
      sectionId,
      chunkId: sectionMap.get(sectionId)?.chunkId ?? null,
      headingId: hashId,
      targetId: null,
      term: '',
    };
  }

  return null;
}

export function useTargetNavigation({
  articleRef,
  location,
  navigate,
  headingToSectionMap,
  sectionMap,
  mountedSections,
  sectionReadyTick,
  recordMetric,
  clearSearchHighlights,
  highlightElementText,
  scrollOffset,
  highlightDurationMs,
  targetStabilizationMs,
  onDebugEvent = null,
}) {
  const [pendingTarget, setPendingTarget] = useState(null);
  const [targetStabilization, setTargetStabilization] = useState(null);
  const [outlineAutoFollowLockUntil, setOutlineAutoFollowLockUntil] = useState(0);
  const highlightTimeoutRef = useRef(null);

  useEffect(() => {
    const nextTarget = buildNavigationTarget(location, headingToSectionMap, sectionMap);
    setPendingTarget(nextTarget);
    if (nextTarget) {
      onDebugEvent?.('target_navigation', 'target_parsed', {
        type: nextTarget.type,
        sectionId: nextTarget.sectionId,
        chunkId: nextTarget.chunkId,
        headingId: nextTarget.headingId,
        targetId: nextTarget.targetId,
      });
    }

    if (nextTarget) {
      const lockUntil = Date.now() + targetStabilizationMs;
      setTargetStabilization({
        ...nextTarget,
        until: lockUntil,
        syncedSearchState: !location.state?.searchNavigation,
      });
      setOutlineAutoFollowLockUntil(lockUntil);
    } else {
      setTargetStabilization(null);
      setOutlineAutoFollowLockUntil(0);
    }
  }, [headingToSectionMap, location, onDebugEvent, sectionMap, targetStabilizationMs]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!pendingTarget?.sectionId || !articleRef.current || mountedSections[pendingTarget.sectionId]) {
      return;
    }

    const placeholder = articleRef.current.querySelector(
      `[data-section-id="${CSS.escape(pendingTarget.sectionId)}"]`,
    );
    if (placeholder) {
      scrollIntoViewWithOffset(placeholder, scrollOffset, 'auto');
    }
  }, [articleRef, mountedSections, pendingTarget, scrollOffset]);

  useEffect(() => {
    if (!pendingTarget || !articleRef.current) {
      return;
    }

    if (pendingTarget.sectionId && !mountedSections[pendingTarget.sectionId]) {
      return;
    }

    const root = articleRef.current;
    clearSearchHighlights(root);

    let target = null;
    if (pendingTarget.targetId) {
      target = root.querySelector(`[data-search-target-id="${CSS.escape(pendingTarget.targetId)}"]`);
    }

    if (!target && pendingTarget.headingId) {
      target = document.getElementById(pendingTarget.headingId);
    }

    if (!target) {
      return;
    }

    scrollIntoViewWithOffset(target, scrollOffset, 'auto');
    if (pendingTarget.term) {
      highlightElementText(target, pendingTarget.term);
    } else {
      target.classList.add('doc-search-hit');
    }
    onDebugEvent?.('target_navigation', 'highlight_applied', {
      headingId: pendingTarget.headingId,
      targetId: pendingTarget.targetId,
      type: pendingTarget.type,
    });

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      if (articleRef.current) {
        clearSearchHighlights(articleRef.current);
      }
    }, highlightDurationMs);

    const navigationType = pendingTarget.type;
    const alignedHeadingId = pendingTarget.headingId;
    const targetId = pendingTarget.targetId;
    setPendingTarget(null);

    if (navigationType === 'search' && targetStabilization && !targetStabilization.syncedSearchState) {
      navigate(
        {
          pathname: location.pathname,
          hash: alignedHeadingId ? `#${alignedHeadingId}` : location.hash,
        },
        { replace: true, state: null },
      );
      setTargetStabilization((current) => (current ? { ...current, syncedSearchState: true } : current));
    }

    recordMetric('target_navigation.complete', {
      headingId: alignedHeadingId,
      targetId,
      type: navigationType,
    });
    onDebugEvent?.('target_navigation', 'heading_aligned', {
      headingId: alignedHeadingId,
      targetId,
      type: navigationType,
    });
  }, [
    articleRef,
    clearSearchHighlights,
    highlightDurationMs,
    highlightElementText,
    location.hash,
    location.pathname,
    mountedSections,
    navigate,
    pendingTarget,
    onDebugEvent,
    recordMetric,
    scrollOffset,
    sectionReadyTick,
    targetStabilization,
  ]);

  useEffect(() => {
    if (!targetStabilization || !articleRef.current) {
      return;
    }

    if (Date.now() >= targetStabilization.until) {
      setTargetStabilization(null);
      setOutlineAutoFollowLockUntil(0);
      return;
    }

    let target = null;
    if (targetStabilization.targetId) {
      target = articleRef.current.querySelector(
        `[data-search-target-id="${CSS.escape(targetStabilization.targetId)}"]`,
      );
    }

    if (!target && targetStabilization.headingId) {
      target = document.getElementById(targetStabilization.headingId);
    }

    if (target) {
      scrollIntoViewWithOffset(target, scrollOffset, 'auto');
    }

    const timer = window.setTimeout(() => {
      setTargetStabilization((current) => {
        if (!current) {
          return current;
        }
        return Date.now() >= current.until ? null : current;
      });
      if (Date.now() >= targetStabilization.until) {
        setOutlineAutoFollowLockUntil(0);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [articleRef, scrollOffset, sectionReadyTick, targetStabilization]);

  const handleHeadingNavigation = useCallback((headingId) => {
    const sectionId = headingToSectionMap.get(headingId);
    if (!sectionId) {
      return;
    }

    window.history.replaceState(null, '', `#${headingId}`);
    const lockUntil = Date.now() + targetStabilizationMs;
    const nextTarget = {
      type: 'hash',
      sectionId,
      chunkId: sectionMap.get(sectionId)?.chunkId ?? null,
      headingId,
      targetId: null,
      term: '',
    };

    setOutlineAutoFollowLockUntil(lockUntil);
    setTargetStabilization({
      ...nextTarget,
      until: lockUntil,
      syncedSearchState: true,
    });
    setPendingTarget(nextTarget);
    onDebugEvent?.('target_navigation', 'chunk_prioritized', {
      headingId,
      sectionId,
      chunkId: nextTarget.chunkId,
    });
  }, [headingToSectionMap, onDebugEvent, sectionMap, targetStabilizationMs]);

  return {
    pendingTarget,
    targetStabilization,
    outlineAutoFollowLockUntil,
    prioritizedNavigationActive: Boolean(location.hash || location.state?.searchNavigation || pendingTarget || targetStabilization),
    prioritizedSectionId: pendingTarget?.sectionId ?? targetStabilization?.sectionId ?? null,
    handleHeadingNavigation,
  };
}
