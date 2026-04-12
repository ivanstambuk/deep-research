import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyReaderNavigation, createEmptyNavigationDebugState } from './debug.js';
import { clearInitialHash, resolveLocationHash } from './initialHash.js';
import { scrollIntoViewWithOffset } from './scroll.js';
import { isHeavyTargetContentClass } from './targetContent.js';

function buildNavigationTarget(location, headingToSectionMap, sectionMap, resolvedHashId = '') {
  const navigationState = location.state?.searchNavigation;
  const hashId = resolvedHashId;

  if (navigationState) {
    const sectionId = navigationState.sectionId
      ?? (navigationState.headingId ? headingToSectionMap.get(navigationState.headingId) : null)
      ?? null;
    const section = sectionMap.get(sectionId) ?? null;
    return {
      type: 'search',
      source: 'search',
      sectionId,
      chunkId: navigationState.chunkId ?? section?.chunkId ?? null,
      headingId: navigationState.headingId ?? null,
      targetId: navigationState.targetId ?? null,
      term: navigationState.term ?? '',
      contentClass: section?.contentClass ?? 'plain',
      restoreHashOnAlign: false,
    };
  }

  if (hashId) {
    const sectionId = headingToSectionMap.get(hashId) ?? null;
    const section = sectionMap.get(sectionId) ?? null;
    return {
      type: 'hash',
      source: 'hash',
      sectionId,
      chunkId: section?.chunkId ?? null,
      headingId: hashId,
      targetId: null,
      term: '',
      contentClass: section?.contentClass ?? 'plain',
      restoreHashOnAlign: true,
    };
  }

  return null;
}

function resolveTargetElements(root, target) {
  if (!root || !target) {
    return {
      targetNode: null,
      sectionNode: null,
    };
  }

  let targetNode = null;
  if (target.targetId) {
    targetNode = root.querySelector(`[data-search-target-id="${CSS.escape(target.targetId)}"]`);
  }

  if (!targetNode && target.headingId) {
    targetNode = document.getElementById(target.headingId);
  }

  const sectionNode = target.sectionId
    ? root.querySelector(`[data-section-id="${CSS.escape(target.sectionId)}"]`)
    : targetNode?.closest('[data-section-id]') ?? null;

  return {
    targetNode,
    sectionNode,
  };
}

function hasSettledMermaid(sectionNode) {
  const mermaidNodes = Array.from(sectionNode?.querySelectorAll('.mermaid') ?? []);
  if (!mermaidNodes.length) {
    return false;
  }

  return mermaidNodes.every((node) => {
    if (node.querySelector('svg')) {
      return true;
    }

    return (node.textContent ?? '').trim().length > 0;
  });
}

function isTargetStable({
  contentClass,
  sectionNode,
  readyAt,
  sectionReadyAt,
}) {
  if (!sectionNode) {
    return false;
  }

  const timingAnchor = Math.max(readyAt ?? 0, sectionReadyAt ?? 0);
  const hasSettledLayout = timingAnchor > 0 && (Date.now() - timingAnchor) >= 96;

  if (contentClass === 'plain') {
    return hasSettledLayout;
  }

  if (contentClass === 'heavy_table') {
    return hasSettledLayout;
  }

  if (contentClass === 'mermaid') {
    return hasSettledMermaid(sectionNode);
  }

  if (contentClass === 'mixed') {
    return hasSettledLayout && hasSettledMermaid(sectionNode);
  }

  return !isHeavyTargetContentClass(contentClass);
}

function isTargetInRevealBand(targetNode, minTop = 0, maxTop = 180) {
  if (!targetNode) {
    return false;
  }

  const top = targetNode.getBoundingClientRect().top;
  return top >= minTop && top <= maxTop;
}

function measureAbsoluteTop(node) {
  if (!node) {
    return null;
  }

  return window.scrollY + node.getBoundingClientRect().top;
}

function getSectionsUpToTargetReadyInfo(sectionMap, readySections, targetSectionId) {
  if (!targetSectionId) {
    return {
      allReady: true,
      latestReadyAt: 0,
    };
  }

  const targetSection = sectionMap.get(targetSectionId);
  if (!targetSection) {
    return {
      allReady: false,
      latestReadyAt: 0,
    };
  }

  let latestReadyAt = 0;
  for (const section of sectionMap.values()) {
    if (section.renderOrder > targetSection.renderOrder) {
      continue;
    }

    const readyAt = readySections[section.sectionId] ?? 0;
    if (!readyAt) {
      return {
        allReady: false,
        latestReadyAt,
      };
    }
    latestReadyAt = Math.max(latestReadyAt, readyAt);
  }

  return {
    allReady: true,
    latestReadyAt,
  };
}

function areSectionsUpToTargetLaidOut(root, sectionMap, targetSectionId) {
  if (!root || !targetSectionId) {
    return false;
  }

  const targetSection = sectionMap.get(targetSectionId);
  if (!targetSection) {
    return false;
  }

  for (const section of sectionMap.values()) {
    if (section.renderOrder > targetSection.renderOrder) {
      continue;
    }

    const slot = root.querySelector(`[data-section-id="${CSS.escape(section.sectionId)}"][data-reader-section-mounted="true"]`);
    if (!(slot instanceof HTMLElement)) {
      return false;
    }

    if (slot.getAttribute('data-reader-layout-forced') !== 'true') {
      return false;
    }

    if (slot.style.contentVisibility === 'auto') {
      return false;
    }
  }

  return true;
}

export function useTargetNavigation({
  articleRef,
  location,
  navigate,
  headingToSectionMap,
  sectionMap,
  mountedSections,
  readySections,
  sectionReadyTick,
  recordMetric,
  clearSearchHighlights,
  highlightElementText,
  scrollOffset,
  highlightDurationMs,
  targetStabilizationMs,
  activeHeadingId = null,
  onDebugEvent = null,
  onNavigationStateChange = null,
}) {
  const [pendingTarget, setPendingTarget] = useState(null);
  const [targetStabilization, setTargetStabilization] = useState(null);
  const [outlineAutoFollowLockUntil, setOutlineAutoFollowLockUntil] = useState(0);
  const [navigationState, setNavigationState] = useState(() => createEmptyNavigationDebugState());
  const highlightTimeoutRef = useRef(null);
  const lastAlignedTargetKeyRef = useRef(null);
  const postRevealArmKeyRef = useRef(null);
  const scrollCommandCountRef = useRef(0);
  const invariantFlagsRef = useRef({
    earlyReveal: false,
    earlyTocTransfer: false,
    multiJump: false,
  });
  const initialHashRef = useRef('');
  const skipNextHashNavigationRef = useRef('');
  const overflowAnchorRestoreRef = useRef(null);
  const currentSectionId = activeHeadingId ? headingToSectionMap.get(activeHeadingId) ?? null : null;

  const suppressScrollAnchoring = useCallback(() => {
    if (typeof document === 'undefined' || overflowAnchorRestoreRef.current) {
      return;
    }

    const root = document.documentElement;
    const previousInlineValue = root.style.getPropertyValue('overflow-anchor');
    root.style.setProperty('overflow-anchor', 'none');
    overflowAnchorRestoreRef.current = () => {
      if (previousInlineValue) {
        root.style.setProperty('overflow-anchor', previousInlineValue);
      } else {
        root.style.removeProperty('overflow-anchor');
      }
      overflowAnchorRestoreRef.current = null;
    };
  }, []);

  const restoreScrollAnchoring = useCallback(() => {
    overflowAnchorRestoreRef.current?.();
  }, []);

  useEffect(() => {
    const resolvedHashId = resolveLocationHash(location.pathname, location.search, location.hash);
    if (resolvedHashId) {
      initialHashRef.current = resolvedHashId;
    }
  }, [location.hash, location.pathname, location.search]);

  const publishNavigationState = useCallback((patch) => {
    setNavigationState((current) => {
      const earlyReveal =
        patch.navigationMode === 'target_first'
        && patch.revealMode !== 'revealed'
        && patch.visibleArticleBeforeReveal === true;
      const earlyTocTransfer =
        patch.navigationMode === 'target_first'
        && patch.phase !== 'settled'
        && patch.tocOwner === 'scroll_spy';
      const multiJump =
        patch.navigationMode === 'target_first'
        && Number(patch.scrollCommandCount ?? current.scrollCommandCount ?? 0) > 1;

      const nextState = {
        ...current,
        ...patch,
        earlyRevealCount: current.earlyRevealCount + (
          earlyReveal && !invariantFlagsRef.current.earlyReveal ? 1 : 0
        ),
        earlyTocTransferCount: current.earlyTocTransferCount + (
          earlyTocTransfer && !invariantFlagsRef.current.earlyTocTransfer ? 1 : 0
        ),
        multiJumpCount: current.multiJumpCount + (
          multiJump && !invariantFlagsRef.current.multiJump ? 1 : 0
        ),
      };
      invariantFlagsRef.current = {
        earlyReveal,
        earlyTocTransfer,
        multiJump,
      };
      onNavigationStateChange?.(nextState);
      return nextState;
    });
  }, [onNavigationStateChange]);

  const issueScrollCommand = useCallback((element, reason, offset = scrollOffset) => {
    if (!element) {
      return null;
    }

    scrollCommandCountRef.current += 1;
    publishNavigationState({
      scrollOwner: 'target_navigation',
      scrollCommandCount: scrollCommandCountRef.current,
    });
    scrollIntoViewWithOffset(element, offset, 'auto');
    const targetTop = Math.round(element.getBoundingClientRect().top);
    onDebugEvent?.('target_navigation', 'scroll_command', {
      reason,
      targetTop,
      scrollCommandCount: scrollCommandCountRef.current,
    });
    publishNavigationState({
      scrollOwner: 'none',
      scrollCommandCount: scrollCommandCountRef.current,
    });
    return targetTop;
  }, [onDebugEvent, publishNavigationState, scrollOffset]);

  const getTargetKey = useCallback((target) => {
    if (!target) {
      return null;
    }

    return [
      target.type ?? '',
      target.sectionId ?? '',
      target.headingId ?? '',
      target.targetId ?? '',
    ].join('::');
  }, []);

  const finalizeReveal = useCallback((target, contentClass, metadata = {}) => {
    const targetKey = getTargetKey(target);
    let targetTop = navigationState.firstRevealedTargetTop ?? null;

    if (articleRef.current) {
      const { targetNode } = resolveTargetElements(articleRef.current, target);
      if (targetNode && lastAlignedTargetKeyRef.current !== targetKey) {
        targetTop = issueScrollCommand(targetNode, 'target_reveal');
        lastAlignedTargetKeyRef.current = targetKey;
      } else if (targetNode) {
        targetTop = Math.round(targetNode.getBoundingClientRect().top);
      }
    }

    publishNavigationState({
      phase: 'settled',
      targetReady: true,
      targetStable: true,
      targetContentClass: contentClass,
      revealMode: 'revealed',
      revealSuppressedReason: null,
      visibleArticleBeforeReveal: false,
      tocOwner: 'scroll_spy',
      firstRevealedTargetTop: targetTop,
    });

    recordMetric('target_navigation.complete', {
      headingId: target.headingId,
      targetId: target.targetId,
      type: target.type,
      contentClass,
      ...metadata,
    });
    onDebugEvent?.('target_navigation', 'target_revealed', {
      headingId: target.headingId,
      targetId: target.targetId,
      type: target.type,
      contentClass,
      targetTop,
      ...metadata,
    });
    if (
      target.headingId
      && typeof window !== 'undefined'
      && (
        target.restoreHashOnAlign
        || target.type === 'search'
      )
      && window.location.hash !== `#${target.headingId}`
    ) {
      if (target.type === 'search') {
        skipNextHashNavigationRef.current = target.headingId;
        navigate(
          {
            pathname: location.pathname,
            search: location.search,
            hash: `#${target.headingId}`,
          },
          { replace: true, state: null },
        );
      }

      const preservedScrollY = window.scrollY;
      window.history.replaceState(
        window.history.state,
        '',
        `${location.pathname}${location.search}#${target.headingId}`,
      );
      const restoreScrollPosition = () => {
        if (Math.abs(window.scrollY - preservedScrollY) > 1) {
          window.scrollTo({ top: preservedScrollY, behavior: 'auto' });
        }
      };
      window.requestAnimationFrame(restoreScrollPosition);
      window.setTimeout(restoreScrollPosition, 32);
      window.setTimeout(restoreScrollPosition, 96);
      window.setTimeout(restoreScrollPosition, 192);
    }
    if (target.type === 'hash' && target.headingId) {
      initialHashRef.current = '';
    }
    restoreScrollAnchoring();
  }, [
    articleRef,
    getTargetKey,
    issueScrollCommand,
    location.pathname,
    location.search,
    navigate,
    navigationState.firstRevealedTargetTop,
    onDebugEvent,
    publishNavigationState,
    recordMetric,
    restoreScrollAnchoring,
  ]);

  useEffect(() => () => {
    restoreScrollAnchoring();
  }, [restoreScrollAnchoring]);

  useEffect(() => {
    const currentHashId = decodeURIComponent(String(location.hash ?? '').replace(/^#/, ''));
    const liveHashId = typeof window !== 'undefined'
      ? decodeURIComponent(String(window.location.hash ?? '').replace(/^#/, ''))
      : '';
    if (currentHashId && skipNextHashNavigationRef.current === currentHashId) {
      skipNextHashNavigationRef.current = '';
      return;
    }

    const resolvedHashId = decodeURIComponent(String(location.hash ?? '').replace(/^#/, ''))
      || initialHashRef.current;
    const nextTarget = buildNavigationTarget(
      location,
      headingToSectionMap,
      sectionMap,
      resolvedHashId,
    );
    scrollCommandCountRef.current = 0;
    invariantFlagsRef.current = {
      earlyReveal: false,
      earlyTocTransfer: false,
      multiJump: false,
    };
    if (
      nextTarget?.type === 'hash'
      && nextTarget.headingId
      && resolvedHashId
    ) {
      clearInitialHash();
      initialHashRef.current = resolvedHashId;
    }
    setPendingTarget(nextTarget);
    if (nextTarget) {
      const navigationMode = classifyReaderNavigation({
        source: nextTarget.source ?? nextTarget.type,
        currentSectionId,
        targetSectionId: nextTarget.sectionId,
        mountedSections,
      });
      const targetFirst = navigationMode === 'target_first';
      if (targetFirst) {
        postRevealArmKeyRef.current = getTargetKey(nextTarget);
        suppressScrollAnchoring();
      }
      publishNavigationState({
        phase: 'resolving_target',
        navigationMode,
        resolvedTarget: {
          source: nextTarget.source ?? nextTarget.type,
          type: nextTarget.type,
          sectionId: nextTarget.sectionId,
          chunkId: nextTarget.chunkId,
          headingId: nextTarget.headingId,
          targetId: nextTarget.targetId,
          contentClass: nextTarget.contentClass ?? 'plain',
        },
        targetContentClass: nextTarget.contentClass ?? 'plain',
        targetReady: false,
        targetStable: false,
        revealMode: targetFirst ? 'masked' : 'revealed',
        revealSuppressedReason: targetFirst ? 'preparing_target' : null,
        scrollOwner: 'none',
        scrollCommandCount: 0,
        visibleArticleBeforeReveal: !targetFirst,
        tocOwner: 'resolved_target',
        firstRevealedTargetTop: null,
      });
      onDebugEvent?.('target_navigation', 'target_parsed', {
        type: nextTarget.type,
        source: nextTarget.source ?? nextTarget.type,
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
      postRevealArmKeyRef.current = null;
      setTargetStabilization(null);
      setOutlineAutoFollowLockUntil(0);
      if (!liveHashId && !location.state?.searchNavigation) {
        publishNavigationState(createEmptyNavigationDebugState());
      }
    }
  }, [
    headingToSectionMap,
    location,
    onDebugEvent,
    publishNavigationState,
    sectionMap,
    targetStabilizationMs,
    getTargetKey,
    suppressScrollAnchoring,
  ]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!pendingTarget?.sectionId || !articleRef.current || mountedSections[pendingTarget.sectionId]) {
      return;
    }

    const navigationMode = classifyReaderNavigation({
      source: pendingTarget.source ?? pendingTarget.type,
      currentSectionId,
      targetSectionId: pendingTarget.sectionId,
      mountedSections,
    });
    publishNavigationState({
      phase: 'preparing_target',
      navigationMode,
      targetContentClass: pendingTarget.contentClass ?? 'plain',
      targetReady: false,
      targetStable: false,
      revealMode: navigationMode === 'target_first' ? 'masked' : 'revealed',
      revealSuppressedReason: 'waiting_for_target_mount',
      visibleArticleBeforeReveal: navigationMode !== 'target_first',
      tocOwner: 'resolved_target',
    });
  }, [
    articleRef,
    currentSectionId,
    mountedSections,
    pendingTarget,
    publishNavigationState,
  ]);

  useEffect(() => {
    if (!pendingTarget || !articleRef.current) {
      return;
    }

    if (pendingTarget.sectionId && !mountedSections[pendingTarget.sectionId]) {
      return;
    }

    const root = articleRef.current;
    clearSearchHighlights(root);
    const { targetNode, sectionNode } = resolveTargetElements(root, pendingTarget);
    if (!targetNode) {
      return;
    }

    const contentClass = pendingTarget.contentClass ?? sectionMap.get(pendingTarget.sectionId)?.contentClass ?? 'plain';
    const sectionReadyAt = readySections[pendingTarget.sectionId] ?? 0;
    const priorLayoutInfo = getSectionsUpToTargetReadyInfo(sectionMap, readySections, pendingTarget.sectionId);
    const priorLayoutDomReady = areSectionsUpToTargetLaidOut(
      articleRef.current,
      sectionMap,
      pendingTarget.sectionId,
    );
    // Do not block target-first reveal on every prior section's async "ready"
    // signal. For far appendix jumps that can mean waiting on many earlier
    // Mermaid-heavy sections even though the forced layout chain is already
    // mountable. We rely on the forced DOM layout plus post-reveal stabilization
    // instead.
    const priorLayoutReady = priorLayoutDomReady
      && (
        !priorLayoutInfo.allReady
        || (Date.now() - priorLayoutInfo.latestReadyAt) >= 96
      );
    const readyAt = Date.now();
    const stable = isTargetStable({
      contentClass,
      sectionNode,
      readyAt,
      sectionReadyAt,
    });

    const navigationMode = classifyReaderNavigation({
      source: pendingTarget.source ?? pendingTarget.type,
      currentSectionId,
      targetSectionId: pendingTarget.sectionId,
      mountedSections,
    });
    const targetFirst = navigationMode === 'target_first';
    const effectiveStable = targetFirst ? stable : true;

    publishNavigationState({
      phase: 'ready_to_reveal',
      navigationMode,
      targetContentClass: contentClass,
      targetReady: true,
      targetStable: effectiveStable,
      revealMode: targetFirst ? 'masked' : 'revealed',
      revealSuppressedReason: targetFirst
        ? (!priorLayoutReady ? 'awaiting_prior_layout' : (!stable ? 'awaiting_target_stability' : null))
        : null,
      visibleArticleBeforeReveal: !targetFirst,
      tocOwner: 'resolved_target',
    });

    const navigationType = pendingTarget.type;
    const alignedHeadingId = pendingTarget.headingId;
    const targetId = pendingTarget.targetId;
    const restoreHashOnAlign = pendingTarget.restoreHashOnAlign;
    const firstRevealTargetTop = Math.round(targetNode.getBoundingClientRect().top);
    setPendingTarget(null);
    setTargetStabilization((current) => (current ? {
      ...current,
      contentClass,
      readyAt: current.readyAt ?? readyAt,
      syncedSearchState: current.syncedSearchState ?? !location.state?.searchNavigation,
    } : current));

    if (effectiveStable && (!targetFirst || priorLayoutReady)) {
      if (pendingTarget.term) {
        highlightElementText(targetNode, pendingTarget.term);
      } else {
        targetNode.classList.add('doc-search-hit');
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

      if (targetFirst) {
        setTargetStabilization((current) => (current ? {
          ...current,
          contentClass,
          readyAt: current.readyAt ?? readyAt,
          sectionReadyAt: readySections[pendingTarget.sectionId] ?? 0,
          preRevealAbsoluteTop: measureAbsoluteTop(targetNode),
          preRevealStableSamples: 0,
          postReveal: false,
        } : current));
        return;
      }

      const targetTop = issueScrollCommand(targetNode, 'target_reveal');
      lastAlignedTargetKeyRef.current = getTargetKey(pendingTarget);
      postRevealArmKeyRef.current = getTargetKey(pendingTarget);

      publishNavigationState({
        phase: 'revealing_target',
        targetReady: true,
        targetStable: effectiveStable,
        targetContentClass: contentClass,
        revealMode: 'revealing',
        revealSuppressedReason: null,
        visibleArticleBeforeReveal: false,
        tocOwner: 'resolved_target',
        firstRevealedTargetTop: targetTop ?? firstRevealTargetTop,
      });

      finalizeReveal(pendingTarget, contentClass, {
        headingId: alignedHeadingId,
        targetId,
        type: navigationType,
      });
    }
  }, [
    articleRef,
    clearSearchHighlights,
    currentSectionId,
    finalizeReveal,
    highlightDurationMs,
    highlightElementText,
    location.hash,
    location.pathname,
    location.search,
    mountedSections,
    navigate,
    pendingTarget,
    publishNavigationState,
    onDebugEvent,
    recordMetric,
    readySections,
    sectionReadyTick,
    sectionMap,
    targetStabilization,
    issueScrollCommand,
  ]);

  useEffect(() => {
    if (!targetStabilization || !articleRef.current) {
      return;
    }

    if (Date.now() >= targetStabilization.until) {
      setTargetStabilization(null);
      setOutlineAutoFollowLockUntil(0);
      finalizeReveal(targetStabilization, targetStabilization.contentClass ?? 'plain', {
        reason: 'stabilization_timeout',
      });
      return;
    }

    const { targetNode, sectionNode } = resolveTargetElements(articleRef.current, targetStabilization);
    const stabilizationKey = getTargetKey(targetStabilization);
    const contentClass = targetStabilization.contentClass
      ?? sectionMap.get(targetStabilization.sectionId)?.contentClass
      ?? 'plain';
    const stabilizationMode = classifyReaderNavigation({
      source: targetStabilization.source ?? targetStabilization.type,
      currentSectionId,
      targetSectionId: targetStabilization.sectionId,
      mountedSections,
    });
    const targetFirstStabilization = stabilizationMode === 'target_first';
    const ready = Boolean(targetNode);
    const priorLayoutInfo = getSectionsUpToTargetReadyInfo(
      sectionMap,
      readySections,
      targetStabilization.sectionId,
    );
    const priorLayoutDomReady = areSectionsUpToTargetLaidOut(
      articleRef.current,
      sectionMap,
      targetStabilization.sectionId,
    );
    const priorLayoutReady = priorLayoutDomReady
      && (
        !priorLayoutInfo.allReady
        || (Date.now() - priorLayoutInfo.latestReadyAt) >= 96
      );
    const stable = ready && isTargetStable({
      contentClass,
      sectionNode,
      readyAt: targetStabilization.readyAt ?? 0,
      sectionReadyAt: readySections[targetStabilization.sectionId] ?? 0,
    });

    if (targetStabilization.postReveal && postRevealArmKeyRef.current === stabilizationKey) {
      postRevealArmKeyRef.current = null;
    }

    if (targetNode) {
      publishNavigationState({
        phase: targetStabilization.postReveal
          ? 'revealing_target'
          : (stable ? 'ready_to_reveal' : 'preparing_target'),
        targetReady: ready,
        targetStable: targetFirstStabilization ? stable : ready,
        targetContentClass: contentClass,
        revealMode: targetStabilization.postReveal
          ? 'revealing'
          : (targetFirstStabilization ? (stable ? 'revealing' : 'masked') : 'revealed'),
        revealSuppressedReason: targetStabilization.postReveal
          ? null
          : (
              targetFirstStabilization
                ? (!priorLayoutReady ? 'awaiting_prior_layout' : (stable ? null : 'awaiting_target_stability'))
                : null
            ),
        visibleArticleBeforeReveal: !targetFirstStabilization,
        tocOwner: targetFirstStabilization ? 'resolved_target' : 'scroll_spy',
      });
    }

    if (!targetStabilization.postReveal && targetNode && ready && stable && priorLayoutReady) {
      const absoluteTop = measureAbsoluteTop(targetNode);
      const previousAbsoluteTop = targetStabilization.preRevealAbsoluteTop ?? absoluteTop;
      const delta = Math.abs((absoluteTop ?? 0) - (previousAbsoluteTop ?? 0));
      const stableSamples = delta <= 1
        ? (targetStabilization.preRevealStableSamples ?? 0) + 1
        : 0;

      if (stableSamples >= 2) {
        const targetTop = issueScrollCommand(targetNode, 'target_reveal');
        lastAlignedTargetKeyRef.current = stabilizationKey;
        postRevealArmKeyRef.current = stabilizationKey;
        publishNavigationState({
          phase: 'revealing_target',
          targetReady: true,
          targetStable: true,
          targetContentClass: contentClass,
          revealMode: 'revealing',
          revealSuppressedReason: null,
          visibleArticleBeforeReveal: false,
          tocOwner: 'resolved_target',
          firstRevealedTargetTop: targetTop,
        });
        setTargetStabilization((current) => (current ? {
          ...current,
          postReveal: true,
          revealJumpedAt: Date.now(),
          preRevealAbsoluteTop: absoluteTop,
          preRevealStableSamples: stableSamples,
          postRevealStableSamples: 0,
        } : current));
        return;
      }

      setTargetStabilization((current) => (current ? {
        ...current,
        preRevealAbsoluteTop: absoluteTop,
        preRevealStableSamples: stableSamples,
      } : current));
      return;
    }

    if (targetStabilization.postReveal && targetNode) {
      const inBand = isTargetInRevealBand(targetNode);
      const revealJumpAge = Date.now() - (targetStabilization.revealJumpedAt ?? 0);
      const stableSamples = inBand && stable && priorLayoutReady
        ? (targetStabilization.postRevealStableSamples ?? 0) + 1
        : 0;

      if (inBand && stable && priorLayoutReady && revealJumpAge >= 224 && stableSamples >= 3) {
        setTargetStabilization(null);
        setOutlineAutoFollowLockUntil(0);
        postRevealArmKeyRef.current = null;
        finalizeReveal(targetStabilization, contentClass);
        return;
      }

      setTargetStabilization((current) => (current ? {
        ...current,
        postRevealStableSamples: stableSamples,
      } : current));
      return;
    }

    if (ready && stable && (!targetFirstStabilization || priorLayoutReady) && !targetStabilization.postReveal) {
      setTargetStabilization(null);
      setOutlineAutoFollowLockUntil(0);
      postRevealArmKeyRef.current = null;
      if (targetStabilization.term) {
        highlightElementText(targetNode, targetStabilization.term);
      } else {
        targetNode.classList.add('doc-search-hit');
      }
      onDebugEvent?.('target_navigation', 'stability_reached', {
        headingId: targetStabilization.headingId,
        targetId: targetStabilization.targetId,
        type: targetStabilization.type,
        contentClass,
      });
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        if (articleRef.current) {
          clearSearchHighlights(articleRef.current);
        }
      }, highlightDurationMs);
      finalizeReveal(targetStabilization, contentClass);
      return;
    }

    const timer = window.setTimeout(() => {
      setTargetStabilization((current) => {
        if (!current) {
          return current;
        }
        return Date.now() >= current.until ? null : { ...current };
      });
      if (Date.now() >= targetStabilization.until) {
        setOutlineAutoFollowLockUntil(0);
      }
    }, 64);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    articleRef,
    suppressScrollAnchoring,
    issueScrollCommand,
    getTargetKey,
    onDebugEvent,
    publishNavigationState,
    readySections,
    recordMetric,
    sectionMap,
    sectionReadyTick,
    targetStabilization,
  ]);

  const handleHeadingNavigation = useCallback((headingId) => {
    const sectionId = headingToSectionMap.get(headingId);
    if (!sectionId) {
      return;
    }

    const lockUntil = Date.now() + targetStabilizationMs;
    const nextTarget = {
      type: 'hash',
      source: 'toc',
      sectionId,
      chunkId: sectionMap.get(sectionId)?.chunkId ?? null,
      contentClass: sectionMap.get(sectionId)?.contentClass ?? 'plain',
      headingId,
      targetId: null,
      term: '',
      restoreHashOnAlign: true,
    };
    const navigationMode = classifyReaderNavigation({
      source: 'toc',
      currentSectionId,
      targetSectionId: sectionId,
      mountedSections,
    });
    const targetFirst = navigationMode === 'target_first';

    scrollCommandCountRef.current = 0;
    invariantFlagsRef.current = {
      earlyReveal: false,
      earlyTocTransfer: false,
      multiJump: false,
    };
    setOutlineAutoFollowLockUntil(lockUntil);
    setTargetStabilization({
      ...nextTarget,
      until: lockUntil,
      syncedSearchState: true,
    });
    setPendingTarget(nextTarget);
    publishNavigationState({
      phase: 'resolving_target',
      navigationMode,
      resolvedTarget: {
        source: 'toc',
        type: 'hash',
        sectionId,
        chunkId: nextTarget.chunkId,
        headingId,
        targetId: null,
        contentClass: nextTarget.contentClass,
      },
      targetContentClass: nextTarget.contentClass,
      targetReady: false,
      targetStable: false,
      revealMode: targetFirst ? 'masked' : 'revealed',
      revealSuppressedReason: targetFirst ? 'preparing_target' : null,
      scrollOwner: 'none',
      scrollCommandCount: 0,
      visibleArticleBeforeReveal: !targetFirst,
      tocOwner: 'resolved_target',
      firstRevealedTargetTop: null,
    });
    onDebugEvent?.('target_navigation', 'chunk_prioritized', {
      headingId,
      sectionId,
      chunkId: nextTarget.chunkId,
    });
  }, [
    currentSectionId,
    headingToSectionMap,
    mountedSections,
    onDebugEvent,
    publishNavigationState,
    sectionMap,
    targetStabilizationMs,
  ]);

  return {
    navigationState,
    pendingTarget,
    targetStabilization,
    outlineAutoFollowLockUntil,
    prioritizedNavigationActive: Boolean(location.hash || location.state?.searchNavigation || pendingTarget || targetStabilization),
    prioritizedSectionId: pendingTarget?.sectionId ?? targetStabilization?.sectionId ?? null,
    handleHeadingNavigation,
  };
}
