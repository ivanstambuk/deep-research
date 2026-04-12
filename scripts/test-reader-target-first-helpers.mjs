export async function readDebugMarker(page, selector = '[data-reader-debug="state"]') {
  return page.locator(selector).evaluate((node) => ({
    route: node.getAttribute('data-debug-route'),
    scopes: node.getAttribute('data-debug-scopes'),
    uiMode: node.getAttribute('data-debug-ui-mode'),
    readerMode: node.getAttribute('data-debug-reader-mode'),
    navigationPhase: node.getAttribute('data-debug-navigation-phase'),
    navigationMode: node.getAttribute('data-debug-navigation-mode'),
    resolvedTarget: node.getAttribute('data-debug-resolved-target'),
    targetSection: node.getAttribute('data-debug-target-section'),
    targetReady: node.getAttribute('data-debug-target-ready'),
    targetStable: node.getAttribute('data-debug-target-stable'),
    targetContentClass: node.getAttribute('data-debug-target-content-class'),
    revealMode: node.getAttribute('data-debug-reveal-mode'),
    scrollOwner: node.getAttribute('data-debug-scroll-owner'),
    scrollCommandCount: Number(node.getAttribute('data-debug-scroll-command-count') ?? '0'),
    earlyRevealCount: Number(node.getAttribute('data-debug-early-reveal-count') ?? '0'),
    earlyTocTransferCount: Number(node.getAttribute('data-debug-early-toc-transfer-count') ?? '0'),
    multiJumpCount: Number(node.getAttribute('data-debug-multi-jump-count') ?? '0'),
    visibleArticleBeforeReveal: node.getAttribute('data-debug-visible-article-before-reveal'),
    tocOwner: node.getAttribute('data-debug-toc-owner'),
    activeHeading: node.getAttribute('data-debug-active-heading'),
    lastEvent: node.getAttribute('data-debug-last-event'),
    mermaidSvgCount: Number(node.getAttribute('data-debug-mermaid-svg-count') ?? '0'),
    mermaidFallbackCount: Number(node.getAttribute('data-debug-mermaid-fallback-count') ?? '0'),
  }));
}

export function assertInvariantCounts(state, label) {
  if (state.earlyRevealCount !== 0) {
    throw new Error(`${label}: earlyRevealCount=${state.earlyRevealCount}`);
  }
  if (state.earlyTocTransferCount !== 0) {
    throw new Error(`${label}: earlyTocTransferCount=${state.earlyTocTransferCount}`);
  }
  if (state.multiJumpCount !== 0) {
    throw new Error(`${label}: multiJumpCount=${state.multiJumpCount}`);
  }
}

export async function readTargetTop(page, targetId) {
  return page.evaluate((id) => (
    document.getElementById(id)?.getBoundingClientRect().top ?? null
  ), targetId);
}

export async function waitForTargetState(page, {
  targetId,
  expectedMode,
  minTop = 0,
  maxTop = 180,
  expectedScrollCommands = null,
  maxScrollCommands = null,
  expectedRouteHash = null,
}) {
  await page.waitForFunction(
    ({
      targetId: currentTargetId,
      expectedMode: currentExpectedMode,
      minTop: currentMinTop,
      maxTop: currentMaxTop,
      expectedScrollCommands: currentExpectedScrollCommands,
      maxScrollCommands: currentMaxScrollCommands,
      expectedRouteHash: currentExpectedRouteHash,
    }) => {
      const target = document.getElementById(currentTargetId);
      const marker = document.querySelector('[data-reader-debug="state"]');
      if (!target || !marker) {
        return false;
      }

      const top = target.getBoundingClientRect().top;
      const scrollCommands = Number(marker.getAttribute('data-debug-scroll-command-count') ?? '0');

      return (
        top >= currentMinTop &&
        top <= currentMaxTop &&
        (currentExpectedRouteHash == null || marker.getAttribute('data-debug-route')?.includes(currentExpectedRouteHash)) &&
        marker.getAttribute('data-debug-resolved-target') === currentTargetId &&
        marker.getAttribute('data-debug-navigation-mode') === currentExpectedMode &&
        (currentExpectedScrollCommands == null || scrollCommands === currentExpectedScrollCommands) &&
        (currentMaxScrollCommands == null || scrollCommands <= currentMaxScrollCommands)
      );
    },
    {
      targetId,
      expectedMode,
      minTop,
      maxTop,
      expectedScrollCommands,
      maxScrollCommands,
      expectedRouteHash,
    },
    { timeout: 20_000 },
  );
}
