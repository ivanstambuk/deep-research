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
const GROUP_CHAPTER_ID = 'protocol-foundations';
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

async function assertGroupHeadingRoute(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DOC_SLUG}/${GROUP_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking group chapter route: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(({ slug, chapterId }) => {
    const activeChapter = document.querySelector('.chapter-nav-link.is-active');
    const article = document.querySelector('.chapter-article');
    const heading = article?.querySelector('h2');
    return (
      window.location.pathname === `/${slug}/${chapterId}` &&
      Boolean(activeChapter) &&
      activeChapter.getAttribute('href') === `/${slug}/${chapterId}` &&
      heading?.id === chapterId &&
      heading.textContent?.includes('Protocol Foundations')
    );
  }, {
    slug: DOC_SLUG,
    chapterId: GROUP_CHAPTER_ID,
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

async function assertChapterNavScrollPersistence(page) {
  console.log('[chapter routes smoke] checking left-nav scroll persistence');

  const currentPath = await page.evaluate(() => window.location.pathname);
  const targetPath = await page.evaluate(() => {
    const nav = document.querySelector('.chapter-nav-list');
    const links = [...document.querySelectorAll('.chapter-nav-link:not(.is-group-heading)')];
    nav.scrollTop = Math.max(0, nav.scrollHeight - nav.clientHeight - 24);
    return links.at(-2)?.getAttribute('href') ?? links.at(-1)?.getAttribute('href');
  });

  const beforeScrollTop = await page.locator('.chapter-nav-list').evaluate((node) => node.scrollTop);
  await page.locator(`a.chapter-nav-link[href='${targetPath}']`).click();

  await page.waitForFunction((expectedPath) => (
    window.location.pathname === expectedPath &&
    !document.querySelector('.chapter-loading-card')
  ), targetPath, { timeout: 20_000 });

  const afterScrollTop = await page.locator('.chapter-nav-list').evaluate((node) => node.scrollTop);
  if (Math.abs(afterScrollTop - beforeScrollTop) > 24) {
    throw new Error(`left-nav scroll reset: before=${beforeScrollTop}, after=${afterScrollTop}`);
  }

  await page.goto(`${getBaseUrl(page.__readerPort)}${currentPath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((expectedPath) => (
    window.location.pathname === expectedPath &&
    !document.querySelector('.chapter-loading-card')
  ), currentPath, { timeout: 20_000 });
}

async function assertChapterNavControls(page) {
  console.log('[chapter routes smoke] checking left-nav collapse and resize controls');

  const toggle = page.locator('.chapter-nav-toggle');
  await toggle.click();

  await page.waitForFunction(() => (
    document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed') &&
    window.getComputedStyle(document.querySelector('.chapter-nav-card')).display === 'none'
  ), null, { timeout: 20_000 });

  await toggle.click();

  await page.waitForFunction(() => (
    !document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed') &&
    window.getComputedStyle(document.querySelector('.chapter-nav-card')).display !== 'none'
  ), null, { timeout: 20_000 });

  const sidebar = page.locator('.chapter-nav-sidebar');
  const beforeWidth = await sidebar.evaluate((node) => Math.round(node.getBoundingClientRect().width));
  const resizer = page.locator('.chapter-nav-resizer');
  const handleBox = await resizer.boundingBox();

  if (!handleBox) {
    throw new Error('left-nav resizer is not visible');
  }

  const handleX = handleBox.x + (handleBox.width / 2);
  const handleY = handleBox.y + Math.min(48, handleBox.height / 2);
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX + 120, handleY, { steps: 8 });
  await page.mouse.up();

  await page.waitForFunction((minimumWidth) => {
    const width = Math.round(document.querySelector('.chapter-nav-sidebar')?.getBoundingClientRect().width ?? 0);
    const stored = Number(window.localStorage.getItem('dr-reader-nav-width'));
    return !document.querySelector('.chapter-reader')?.classList.contains('is-resizing-nav') &&
      Number.isFinite(stored) &&
      width >= minimumWidth &&
      Math.abs(width - stored) <= 2;
  }, beforeWidth + 80, { timeout: 20_000 });
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
    await assertGroupHeadingRoute(page);
    await assertChapterNavTransition(page);
    await assertChapterNavScrollPersistence(page);
    await assertChapterNavControls(page);
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
