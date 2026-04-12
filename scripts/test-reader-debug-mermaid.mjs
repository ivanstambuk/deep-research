import process from 'process';
import { chromium } from 'playwright';
import {
  BASE_URL,
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
    svgCount: Number(node.getAttribute('data-debug-mermaid-svg-count') ?? '0'),
    fallbackCount: Number(node.getAttribute('data-debug-mermaid-fallback-count') ?? '0'),
    lastEvent: node.getAttribute('data-debug-last-event'),
  }));
}

async function main() {
  await runCommand('node', ['scripts/build-reader-assets.js']);

  const server = startServer();
  let browser;

  try {
    await waitForFreshServer(BASE_URL, server);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

    const url = `${BASE_URL}/DR-0002-eudi-wallet-relying-party-integration?debug=reader,mermaid&debug_ui=panel#rp-integration-model-selector`;
    console.log(`[reader debug mermaid smoke] checking ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    await page.waitForSelector('[data-reader-debug="state"]', {
      state: 'attached',
      timeout: 20_000,
    });
    await page.waitForSelector('[data-reader-debug="panel"]', { timeout: 20_000 });
    await page.waitForFunction(() => {
      const marker = document.querySelector('[data-reader-debug="state"]');
      const svgCount = Number(marker?.getAttribute('data-debug-mermaid-svg-count') ?? '0');
      const fallbackCount = Number(marker?.getAttribute('data-debug-mermaid-fallback-count') ?? '0');
      const svgNodes = document.querySelectorAll('.doc-article .mermaid svg').length;
      const articleText = document.querySelector('.doc-article')?.textContent ?? '';
      return (
        svgCount > 0 &&
        svgNodes > 0 &&
        fallbackCount === 0 &&
        !articleText.includes('quadrantChart') &&
        !articleText.includes('subGraphTitleMargin') &&
        !articleText.includes('flowchart TD')
      );
    }, { timeout: 20_000 });

    const state = await readDebugMarker(page);
    const panel = await readDebugMarker(page, '[data-reader-debug="panel"]');
    const domSvgCount = await page.evaluate(() => document.querySelectorAll('.doc-article .mermaid svg').length);

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
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error('[reader debug mermaid smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
