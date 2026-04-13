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

const DR2_SLUG = 'DR-0002-eudi-wallet-relying-party-integration';
const DR2_MERMAID_CHAPTER = 'reader-orientation';

async function assertMermaidRoute(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_MERMAID_CHAPTER}#rp-integration-model-selector`;
  console.log(`[reader smoke] checking Mermaid route: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.waitForFunction(() => {
    const svgs = document.querySelectorAll('.doc-article .mermaid svg').length;
    const text = document.querySelector('.doc-article')?.textContent ?? '';
    return (
      svgs > 0 &&
      !text.includes('quadrantChart') &&
      !text.includes('subGraphTitleMargin') &&
      !text.includes('flowchart TD')
    );
  }, { timeout: 20_000 });

  const stats = await page.evaluate(() => ({
    svgCount: document.querySelectorAll('.doc-article .mermaid svg').length,
  }));
  console.log(`[reader smoke] Mermaid route rendered ${stats.svgCount} SVG diagrams`);
}

async function assertSearchJump(page) {
  const url = `${getBaseUrl(page.__readerPort)}/`;
  console.log(`[reader smoke] checking command-palette jump: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.keyboard.press('Control+KeyK');
  await page.waitForSelector('.search-modal', { timeout: 10_000 });
  await page.fill('#reader-global-search', 'CIBA');

  await page.waitForFunction(() => {
    const groups = Array.from(document.querySelectorAll('.search-results-group-label')).map((node) => node.textContent?.trim());
    const resultCount = document.querySelectorAll('.search-result').length;
    return groups.includes('Passages') && resultCount > 0;
  }, { timeout: 10_000 });

  const firstPassageResult = page
    .locator('.search-results-group')
    .filter({ has: page.getByText('Passages', { exact: true }) })
    .locator('.search-result')
    .first();

  const selectedTarget = await firstPassageResult.evaluate((node) => ({
    headingId: node.getAttribute('data-search-result-heading-id') || null,
    targetId: node.getAttribute('data-search-result-target-id') || null,
  }));

  await firstPassageResult.click();

  try {
    await page.waitForFunction(({ headingId, targetId }) => {
      const modalOpen = Boolean(document.querySelector('.search-modal'));
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (modalOpen || !hash || path === '/' || path.split('/').filter(Boolean).length !== 2) {
        return false;
      }

      const target = (headingId && document.getElementById(headingId))
        || document.getElementById(hash.slice(1));
      if (!target) {
        return false;
      }

      const rect = target.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= 260;
    }, selectedTarget, { timeout: 20_000 });
  } catch (error) {
    const diagnostic = await page.evaluate(({ headingId, targetId }) => ({
      modalOpen: Boolean(document.querySelector('.search-modal')),
      path: window.location.pathname,
      hash: window.location.hash,
      targetTop: (headingId && document.getElementById(headingId)?.getBoundingClientRect().top)
        ?? (window.location.hash ? document.getElementById(window.location.hash.slice(1))?.getBoundingClientRect().top ?? null : null),
    }), selectedTarget);
    console.error('[reader smoke] command-palette diagnostic:', diagnostic);
    throw error;
  }

  const result = await page.evaluate(({ headingId, targetId }) => ({
    path: window.location.pathname,
    hash: window.location.hash,
    targetTop: (headingId && document.getElementById(headingId)?.getBoundingClientRect().top)
      ?? (window.location.hash ? document.getElementById(window.location.hash.slice(1))?.getBoundingClientRect().top ?? null : null),
  }), selectedTarget);

  console.log(
    `[reader smoke] command-palette jump landed path=${result.path} hash=${result.hash} targetTop=${Math.round(result.targetTop ?? -1)}`,
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

    await assertMermaidRoute(page);
    await assertSearchJump(page);

    console.log('[reader smoke] Mermaid and command-palette checks passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(await server);
  }
}

withReaderSmokeRunLock(main).catch((error) => {
  console.error('[reader smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
