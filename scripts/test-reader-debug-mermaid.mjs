import process from 'process';
import { chromium } from 'playwright';
import {
  getBaseUrl,
  runCommand,
  startServer,
  stopServer,
  waitForFreshServer,
} from './test-reader-smoke-helpers.mjs';

async function readDebugMarker(page, selector = '[data-reader-debug="state"]') {
  return page.locator(selector).evaluate((node) => ({
    schemaVersion: node.getAttribute('data-debug-schema-version'),
    route: node.getAttribute('data-debug-route'),
    scopes: node.getAttribute('data-debug-scopes'),
    uiMode: node.getAttribute('data-debug-ui-mode'),
    readerMode: node.getAttribute('data-debug-reader-mode'),
    targetContentClass: node.getAttribute('data-debug-target-content-class'),
    earlyRevealCount: Number(node.getAttribute('data-debug-early-reveal-count') ?? '0'),
    earlyTocTransferCount: Number(node.getAttribute('data-debug-early-toc-transfer-count') ?? '0'),
    multiJumpCount: Number(node.getAttribute('data-debug-multi-jump-count') ?? '0'),
    svgCount: Number(node.getAttribute('data-debug-mermaid-svg-count') ?? '0'),
    fallbackCount: Number(node.getAttribute('data-debug-mermaid-fallback-count') ?? '0'),
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

async function assertMermaidHeavyRoute(page) {
  const headingId = '11-rp-authentication-and-presentation-verification';
  const url = `${getBaseUrl(page.__readerPort)}/DR-0002-eudi-wallet-relying-party-integration?debug=reader,target_navigation,mermaid&debug_ui=panel#${headingId}`;
  console.log(`[reader debug mermaid smoke] checking ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.waitForSelector('[data-reader-debug="state"]', {
    state: 'attached',
    timeout: 20_000,
  });
  await page.waitForSelector('[data-reader-debug="panel"]', { timeout: 20_000 });
  await page.waitForFunction((targetId) => {
    const marker = document.querySelector('[data-reader-debug="state"]');
    const target = document.getElementById(targetId);
    const svgCount = Number(marker?.getAttribute('data-debug-mermaid-svg-count') ?? '0');
    const fallbackCount = Number(marker?.getAttribute('data-debug-mermaid-fallback-count') ?? '0');
    const svgNodes = document.querySelectorAll('.doc-article .mermaid svg').length;
    const articleText = document.querySelector('.doc-article')?.textContent ?? '';
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      marker?.getAttribute('data-debug-navigation-mode') === 'target_first' &&
      marker?.getAttribute('data-debug-resolved-target') === targetId &&
      marker?.getAttribute('data-debug-target-content-class') === 'mixed' &&
      marker?.getAttribute('data-debug-target-ready') === 'true' &&
      marker?.getAttribute('data-debug-target-stable') === 'true' &&
      marker?.getAttribute('data-debug-reveal-mode') === 'revealed' &&
      Number(marker?.getAttribute('data-debug-scroll-command-count') ?? '0') <= 1 &&
      top != null &&
      top >= 40 &&
      top <= 240 &&
      svgCount > 0 &&
      svgNodes > 0 &&
      fallbackCount === 0 &&
      !articleText.includes('quadrantChart') &&
      !articleText.includes('subGraphTitleMargin') &&
      !articleText.includes('flowchart TD')
    );
  }, headingId, { timeout: 20_000 });

  const state = await readDebugMarker(page);
  const panel = await readDebugMarker(page, '[data-reader-debug="panel"]');
  const domSvgCount = await page.evaluate(() => document.querySelectorAll('.doc-article .mermaid svg').length);
  assertInvariantCounts(state, 'mermaid-heavy cold route');

  if (!state.scopes?.includes('reader') || !state.scopes?.includes('mermaid')) {
    throw new Error(`Unexpected debug scopes: ${state.scopes}`);
  }

  if (
    state.lastEvent &&
    !state.lastEvent.startsWith('mermaid:') &&
    state.lastEvent !== 'outline:active_heading_changed'
  ) {
    throw new Error(`Unexpected last debug event: ${state.lastEvent}`);
  }

  console.log(
    `[reader debug mermaid smoke] route=${state.route} svg=${state.svgCount} domSvg=${domSvgCount} fallback=${state.fallbackCount} panelUi=${panel.uiMode}`,
  );
}

async function assertTableHeavyRoute(page) {
  const headingId = '8-scim-20-system-for-cross-domain-identity-management';
  const url = `${getBaseUrl(page.__readerPort)}/DR-0003-authentication-and-session-management?debug=reader,target_navigation&debug_ui=panel#${headingId}`;
  console.log(`[reader debug heavy-table smoke] checking ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.waitForSelector('[data-reader-debug="state"]', {
    state: 'attached',
    timeout: 20_000,
  });
  await page.waitForFunction((targetId) => {
    const marker = document.querySelector('[data-reader-debug="state"]');
    const target = document.getElementById(targetId);
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      marker?.getAttribute('data-debug-navigation-mode') === 'target_first' &&
      marker?.getAttribute('data-debug-resolved-target') === targetId &&
      marker?.getAttribute('data-debug-target-content-class') === 'heavy_table' &&
      marker?.getAttribute('data-debug-target-ready') === 'true' &&
      marker?.getAttribute('data-debug-target-stable') === 'true' &&
      marker?.getAttribute('data-debug-reveal-mode') === 'revealed' &&
      Number(marker?.getAttribute('data-debug-scroll-command-count') ?? '0') <= 1 &&
      top != null &&
      top >= 40 &&
      top <= 240
    );
  }, headingId, { timeout: 20_000 });

  const state = await readDebugMarker(page);
  assertInvariantCounts(state, 'table-heavy cold route');
  console.log(
    `[reader debug heavy-table smoke] route=${state.route} contentClass=${state.targetContentClass ?? 'heavy_table'} ui=${state.uiMode}`,
  );
}

async function main() {
  await runCommand('node', ['scripts/build-reader-assets.js']);

  const server = startServer();
  let browser;

  try {
    const serverHandle = await server;
    await waitForFreshServer(serverHandle);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    page.__readerPort = serverHandle.port;

    await assertMermaidHeavyRoute(page);
    await assertTableHeavyRoute(page);
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(await server);
  }
}

main().catch((error) => {
  console.error('[reader debug mermaid smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
