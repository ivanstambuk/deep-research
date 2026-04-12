import process from 'process';
import { chromium } from 'playwright';
import {
  getBaseUrl,
  runCommand,
  startServer,
  stopServer,
  withReaderSmokeRunLock,
  waitForFreshServer,
} from './test-reader-smoke-helpers.mjs';
import { assertInvariantCounts, readDebugMarker } from './test-reader-target-first-helpers.mjs';

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
      top >= 0 &&
      top <= 180 &&
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
    `[reader debug mermaid smoke] route=${state.route} svg=${state.mermaidSvgCount} domSvg=${domSvgCount} fallback=${state.mermaidFallbackCount} panelUi=${panel.uiMode}`,
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
      top >= 0 &&
      top <= 180
    );
  }, headingId, { timeout: 20_000 });

  const state = await readDebugMarker(page);
  assertInvariantCounts(state, 'table-heavy cold route');
  console.log(
    `[reader debug heavy-table smoke] route=${state.route} contentClass=${state.targetContentClass ?? 'heavy_table'} ui=${state.uiMode}`,
  );
}

async function assertSpecificMermaidRoute(page) {
  const headingId = '64-recommendation-layered-identity-strategy-1';
  const url = `${getBaseUrl(page.__readerPort)}/DR-0001-mcp-authentication-authorization-agent-identity?debug=reader,target_navigation,mermaid&debug_ui=panel#${headingId}`;
  console.log(`[reader debug mermaid smoke] checking ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.waitForSelector('[data-reader-debug="state"]', {
    state: 'attached',
    timeout: 20_000,
  });
  await page.waitForFunction((targetId) => {
    const marker = document.querySelector('[data-reader-debug="state"]');
    const target = document.getElementById(targetId);
    const section = target?.closest('[data-section-id]');
    const svgCount = section?.querySelectorAll('.mermaid svg').length ?? 0;
    const rawFallbackVisible = Array.from(section?.querySelectorAll('.mermaid') ?? []).some(
      (node) => !node.querySelector('svg') && (node.textContent ?? '').trim().length > 0,
    );
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      marker?.getAttribute('data-debug-navigation-mode') === 'target_first' &&
      marker?.getAttribute('data-debug-resolved-target') === targetId &&
      marker?.getAttribute('data-debug-target-ready') === 'true' &&
      marker?.getAttribute('data-debug-target-stable') === 'true' &&
      marker?.getAttribute('data-debug-reveal-mode') === 'revealed' &&
      Number(marker?.getAttribute('data-debug-scroll-command-count') ?? '0') <= 1 &&
      top != null &&
      top >= 0 &&
      top <= 180 &&
      svgCount > 0 &&
      !rawFallbackVisible
    );
  }, headingId, { timeout: 20_000 });

  const state = await readDebugMarker(page);
  assertInvariantCounts(state, 'specific mermaid route');
  console.log(
    `[reader debug mermaid smoke] specific route=${state.route} svg=${state.mermaidSvgCount} fallback=${state.mermaidFallbackCount}`,
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
    await assertSpecificMermaidRoute(page);
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(await server);
  }
}

withReaderSmokeRunLock(main).catch((error) => {
  console.error('[reader debug mermaid smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
