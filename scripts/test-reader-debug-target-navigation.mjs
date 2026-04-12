import process from 'process';
import { chromium } from 'playwright';
import {
  getBaseUrl,
  runCommand,
  startServer,
  stopServer,
  waitForFreshServer,
} from './test-reader-smoke-helpers.mjs';

const DEBUG_QUERY = '?debug=reader,target_navigation&debug_ui=panel';
const DR1_PATH = '/DR-0001-mcp-authentication-authorization-agent-identity';
const FAR_HEADING_ID = '3-mcp-scope-lifecycle-discovery-selection-and-challenge';
const LOCAL_HEADING_ID = '32-scope-selection-strategy-november-2025-spec';
const SEARCH_HEADING_ID = '25-session-token-binding-reference-implementation';

async function readDebugMarker(page) {
  return page.locator('[data-reader-debug="state"]').evaluate((node) => ({
    route: node.getAttribute('data-debug-route'),
    uiMode: node.getAttribute('data-debug-ui-mode'),
    navigationPhase: node.getAttribute('data-debug-navigation-phase'),
    navigationMode: node.getAttribute('data-debug-navigation-mode'),
    resolvedTarget: node.getAttribute('data-debug-resolved-target'),
    targetSection: node.getAttribute('data-debug-target-section'),
    targetReady: node.getAttribute('data-debug-target-ready'),
    targetStable: node.getAttribute('data-debug-target-stable'),
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
  }));
}

function assertInvariantCounts(state, label) {
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

async function openDocumentPage(browser, port, pathWithQuery) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  page.__readerPort = port;
  await page.goto(`${getBaseUrl(port)}${pathWithQuery}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('[data-reader-debug="state"]', {
    state: 'attached',
    timeout: 20_000,
  });
  return page;
}

async function dispatchClick(page, selector) {
  await page.locator(selector).waitFor({ state: 'attached', timeout: 10_000 });
  await page.locator(selector).evaluate((node) => {
    if (!(node instanceof HTMLElement)) {
      throw new Error(`Cannot dispatch click on non-HTMLElement for selector ${selector}`);
    }
    node.click();
  });
}

async function readTargetTop(page, targetId) {
  return page.evaluate((id) => (
    document.getElementById(id)?.getBoundingClientRect().top ?? null
  ), targetId);
}

async function waitForTargetState(page, {
  targetId,
  expectedMode,
  minTop = 40,
  maxTop = 240,
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

async function assertFarTocJump(browser, port) {
  const page = await openDocumentPage(browser, port, `${DR1_PATH}${DEBUG_QUERY}`);
  try {
    console.log(`[reader debug target smoke] checking far TOC jump: ${page.url()}`);
    await dispatchClick(page, `[data-outline-id="${FAR_HEADING_ID}"]`);
    await waitForTargetState(page, {
      targetId: FAR_HEADING_ID,
      expectedMode: 'target_first',
      expectedScrollCommands: 1,
    });

    const state = await readDebugMarker(page);
    assertInvariantCounts(state, 'far TOC jump');
    const targetTop = await readTargetTop(page, FAR_HEADING_ID);
    console.log(
      `[reader debug target smoke] far TOC jump route=${state.route} mode=${state.navigationMode} top=${Math.round(targetTop ?? -1)} scrollCommands=${state.scrollCommandCount}`,
    );
  } finally {
    await page.close();
  }
}

async function assertLocalTocJump(browser, port) {
  const page = await openDocumentPage(
    browser,
    port,
    `${DR1_PATH}${DEBUG_QUERY}#${FAR_HEADING_ID}`,
  );
  try {
    await waitForTargetState(page, {
      targetId: FAR_HEADING_ID,
      expectedMode: 'target_first',
      maxScrollCommands: 1,
      expectedRouteHash: `#${FAR_HEADING_ID}`,
    });
    await page.waitForTimeout(300);

    await dispatchClick(page, `[data-outline-id="${LOCAL_HEADING_ID}"]`);
    await waitForTargetState(page, {
      targetId: LOCAL_HEADING_ID,
      expectedMode: 'local',
      expectedScrollCommands: 1,
    });

    const state = await readDebugMarker(page);
    assertInvariantCounts(state, 'local TOC jump');
    const targetTop = await readTargetTop(page, LOCAL_HEADING_ID);
    console.log(
      `[reader debug target smoke] local TOC jump route=${state.route} mode=${state.navigationMode} top=${Math.round(targetTop ?? -1)} scrollCommands=${state.scrollCommandCount}`,
    );
  } finally {
    await page.close();
  }
}

async function assertFarCommandPaletteJump(browser, port) {
  const page = await openDocumentPage(browser, port, `${DR1_PATH}${DEBUG_QUERY}`);
  try {
    await page.keyboard.press('Control+KeyK');
    await page.waitForSelector('.search-modal', { timeout: 10_000 });
    await page.fill('#reader-global-search', 'Session-Token');

    const result = page
      .locator('.search-result')
      .filter({ hasText: '2.5 Session-Token Binding Reference Implementation' })
      .first();

    await result.waitFor({ state: 'visible', timeout: 10_000 });
    await result.evaluate((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new Error('Cannot dispatch click on command-palette result');
      }
      node.click();
    });

    await waitForTargetState(page, {
      targetId: SEARCH_HEADING_ID,
      expectedMode: 'target_first',
      maxScrollCommands: 1,
    });

    const state = await readDebugMarker(page);
    assertInvariantCounts(state, 'far search jump');
    const targetTop = await readTargetTop(page, SEARCH_HEADING_ID);

    if (state.uiMode !== 'panel') {
      throw new Error(`Debug UI mode was not preserved across command-palette navigation: ${state.uiMode}`);
    }

    console.log(
      `[reader debug target smoke] far search jump route=${state.route} mode=${state.navigationMode} top=${Math.round(targetTop ?? -1)} scrollCommands=${state.scrollCommandCount}`,
    );
  } finally {
    await page.close();
  }
}

async function main() {
  await runCommand('node', ['scripts/build-reader-assets.js']);

  const server = startServer();
  let browser;

  try {
    const serverHandle = await server;
    await waitForFreshServer(serverHandle);

    browser = await chromium.launch({ headless: true });

    await assertFarTocJump(browser, serverHandle.port);
    await assertLocalTocJump(browser, serverHandle.port);
    await assertFarCommandPaletteJump(browser, serverHandle.port);

    console.log('[reader debug target smoke] all target-navigation cases passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(await server);
  }
}

main().catch((error) => {
  console.error('[reader debug target smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
