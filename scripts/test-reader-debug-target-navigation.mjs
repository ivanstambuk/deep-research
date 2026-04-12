import process from 'process';
import { chromium } from 'playwright';
import {
  BASE_URL,
  runCommand,
  startServer,
  stopServer,
  waitForFreshServer,
} from './test-reader-smoke-helpers.mjs';

const TARGET_ID = '29-security-threat-catalogue';

async function readDebugMarker(page, selector = '[data-reader-debug="state"]') {
  return page.locator(selector).evaluate((node) => ({
    schemaVersion: node.getAttribute('data-debug-schema-version'),
    route: node.getAttribute('data-debug-route'),
    scopes: node.getAttribute('data-debug-scopes'),
    uiMode: node.getAttribute('data-debug-ui-mode'),
    readerMode: node.getAttribute('data-debug-reader-mode'),
    mountedSections: Number(node.getAttribute('data-debug-mounted-sections') ?? '0'),
    totalSections: Number(node.getAttribute('data-debug-total-sections') ?? '0'),
    loadedChunks: Number(node.getAttribute('data-debug-loaded-chunks') ?? '0'),
    totalChunks: Number(node.getAttribute('data-debug-total-chunks') ?? '0'),
    pendingTarget: node.getAttribute('data-debug-pending-target'),
    activeHeading: node.getAttribute('data-debug-active-heading'),
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

    const url = `${BASE_URL}/DR-0002-eudi-wallet-relying-party-integration?debug=reader,target_navigation&debug_ui=panel#${TARGET_ID}`;
    console.log(`[reader debug target smoke] checking ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    await page.waitForSelector('[data-reader-debug="state"]', {
      state: 'attached',
      timeout: 20_000,
    });
    await page.waitForSelector('[data-reader-debug="panel"]', { timeout: 20_000 });
    await page.waitForFunction((targetId) => {
      const target = document.getElementById(targetId);
      const marker = document.querySelector('[data-reader-debug="state"]');
      if (!target || !marker) {
        return false;
      }

      const top = target.getBoundingClientRect().top;
      return (
        top >= 40 &&
        top <= 240 &&
        marker.getAttribute('data-debug-route')?.includes(`#${targetId}`) &&
        marker.getAttribute('data-debug-active-heading') === targetId &&
        marker.getAttribute('data-debug-ui-mode') === 'panel'
      );
    }, TARGET_ID, { timeout: 20_000 });

    const state = await readDebugMarker(page);
    const panel = await readDebugMarker(page, '[data-reader-debug="panel"]');
    const targetTop = await page.evaluate((targetId) => (
      document.getElementById(targetId)?.getBoundingClientRect().top ?? null
    ), TARGET_ID);

    if (!state.scopes?.includes('reader') || !state.scopes?.includes('target_navigation')) {
      throw new Error(`Unexpected debug scopes: ${state.scopes}`);
    }

    if (!state.lastEvent?.startsWith('target_navigation:') && state.lastEvent !== 'outline:active_heading_changed') {
      throw new Error(`Unexpected last debug event: ${state.lastEvent}`);
    }

    console.log(
      `[reader debug target smoke] route=${state.route} active=${state.activeHeading} top=${Math.round(targetTop ?? -1)} panelUi=${panel.uiMode}`,
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error('[reader debug target smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
