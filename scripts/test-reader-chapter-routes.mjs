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

const DOC_SLUG = 'DR-0001-mcp-authentication-authorization-agent-identity';
const LANDING_CHAPTER_ID = 'executive-decision-summary';
const FIRST_CHAPTER_ID = '1-mcp-authorization-spec-evolution';
const SECOND_CHAPTER_ID = '2-mcp-over-streamable-http-transport-layer-auth-implications';
const THIRD_CHAPTER_ID = '3-mcp-scope-lifecycle-discovery-selection-and-challenge';
const SECOND_HEADING_ID = '21-transport-evolution';

async function assertSlugRedirect(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DOC_SLUG}`;
  console.log(`[chapter routes smoke] checking slug redirect: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(({ slug, chapterId }) => (
    window.location.pathname === `/${slug}/${chapterId}` &&
    window.location.hash === '' &&
    document.querySelector('.chapter-nav-link.is-active')?.getAttribute('href') === `/${slug}/${chapterId}` &&
    Boolean(document.querySelector('.chapter-article'))
  ), {
    slug: DOC_SLUG,
    chapterId: LANDING_CHAPTER_ID,
  }, { timeout: 20_000 });
}

async function assertInitialChapterRoute(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DOC_SLUG}/${FIRST_CHAPTER_ID}#${FIRST_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking initial chapter route: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(({ slug, chapterId, headingId }) => {
    const path = window.location.pathname;
    const article = document.querySelector('.chapter-article');
    const activeChapter = document.querySelector('.chapter-nav-link.is-active');
    const outlineItems = document.querySelectorAll('.chapter-outline-link').length;
    const target = document.getElementById(headingId);
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      path === `/${slug}/${chapterId}` &&
      Boolean(article) &&
      Boolean(activeChapter) &&
      outlineItems >= 1 &&
      activeChapter.getAttribute('href') === `/${slug}/${chapterId}` &&
      top != null &&
      top >= 0 &&
      top <= 180
    );
  }, {
    slug: DOC_SLUG,
    chapterId: FIRST_CHAPTER_ID,
    headingId: FIRST_CHAPTER_ID,
  }, { timeout: 20_000 });
}

async function assertChapterNavTransition(page) {
  console.log('[chapter routes smoke] checking left-nav chapter transition');

  await page.locator(`a.chapter-nav-link[href='/${DOC_SLUG}/${SECOND_CHAPTER_ID}']`).click();

  await page.waitForFunction(({ slug, chapterId }) => (
    window.location.pathname === `/${slug}/${chapterId}` &&
    window.location.hash === '' &&
    document.querySelector('.chapter-nav-link.is-active')?.getAttribute('href') === `/${slug}/${chapterId}` &&
    Boolean(document.querySelector('.chapter-pager'))
  ), {
    slug: DOC_SLUG,
    chapterId: SECOND_CHAPTER_ID,
  }, { timeout: 20_000 });
}

async function assertOutlineHashNavigation(page) {
  console.log('[chapter routes smoke] checking in-chapter outline navigation');

  await page.locator('button.chapter-outline-link').filter({ hasText: '2.1 Transport Evolution' }).click();

  await page.waitForFunction((headingId) => {
    const target = document.getElementById(headingId);
    const activeHeading = document.querySelector('.chapter-outline-link.is-active');
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      window.location.hash === `#${headingId}` &&
      Boolean(activeHeading) &&
      activeHeading.textContent?.includes('2.1 Transport Evolution') &&
      top != null &&
      top >= 0 &&
      top <= 180
    );
  }, SECOND_HEADING_ID, { timeout: 20_000 });
}

async function assertBottomPager(page) {
  console.log('[chapter routes smoke] checking bottom pager navigation');

  await page.locator('.chapter-pager-link.is-next').click();

  await page.waitForFunction(({ slug, chapterId }) => (
    window.location.pathname === `/${slug}/${chapterId}` &&
    document.querySelector('.chapter-nav-link.is-active')?.getAttribute('href') === `/${slug}/${chapterId}`
  ), {
    slug: DOC_SLUG,
    chapterId: THIRD_CHAPTER_ID,
  }, { timeout: 20_000 });
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

    await assertSlugRedirect(page);
    await assertInitialChapterRoute(page);
    await assertChapterNavTransition(page);
    await assertOutlineHashNavigation(page);
    await assertBottomPager(page);

    console.log('[chapter routes smoke] all chapter-route checks passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(await server);
  }
}

withReaderSmokeRunLock(main).catch((error) => {
  console.error('[chapter routes smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
