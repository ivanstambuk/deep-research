import process from 'process';
import { chromium } from 'playwright';
import {
  BASE_URL,
  runCommand,
  startServer,
  stopServer,
  waitForFreshServer,
} from './test-reader-smoke-helpers.mjs';

async function assertMermaidRoute(page) {
  const url = `${BASE_URL}/DR-0002-eudi-wallet-relying-party-integration#rp-integration-model-selector`;
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
  const url = `${BASE_URL}/`;
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

  await page.locator('.search-results-group').filter({ has: page.getByText('Passages', { exact: true }) }).locator('.search-result').first().click();

  try {
    await page.waitForFunction(() => {
      const modalOpen = Boolean(document.querySelector('.search-modal'));
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (modalOpen || !hash || path === '/') {
        return false;
      }

      const target = document.getElementById(hash.slice(1));
      if (!target) {
        return false;
      }

      const rect = target.getBoundingClientRect();
      return rect.top >= 40 && rect.top <= 260;
    }, { timeout: 20_000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      modalOpen: Boolean(document.querySelector('.search-modal')),
      path: window.location.pathname,
      hash: window.location.hash,
      highlightCount: document.querySelectorAll('.doc-search-highlight').length,
      selectedText: document.querySelector('.doc-search-highlight')?.textContent ?? null,
      targetTop: window.location.hash
        ? document.getElementById(window.location.hash.slice(1))?.getBoundingClientRect().top ?? null
        : null,
    }));
    console.error('[reader smoke] command-palette diagnostic:', diagnostic);
    throw error;
  }

  const result = await page.evaluate(() => ({
    path: window.location.pathname,
    hash: window.location.hash,
    highlightCount: document.querySelectorAll('.doc-search-highlight').length,
    targetTop: window.location.hash
      ? document.getElementById(window.location.hash.slice(1))?.getBoundingClientRect().top ?? null
      : null,
  }));

  console.log(
    `[reader smoke] command-palette jump landed path=${result.path} hash=${result.hash} highlights=${result.highlightCount} targetTop=${Math.round(result.targetTop ?? -1)}`,
  );
}

async function main() {
  await runCommand('node', ['scripts/build-reader-assets.js']);

  const server = startServer();
  let browser;

  try {
    await waitForFreshServer(BASE_URL, server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

    await assertMermaidRoute(page);
    await assertSearchJump(page);

    console.log('[reader smoke] Mermaid and command-palette checks passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error('[reader smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
