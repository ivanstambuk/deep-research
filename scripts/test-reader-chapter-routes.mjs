import process from 'process';
import { readFileSync } from 'node:fs';
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
const DR2_SLUG = 'DR-0002-eudi-wallet-relying-party-integration';
const DR2_SOURCE_CHAPTER_ID = '12-cross-device-remote-presentation';
const DR2_TARGET_CHAPTER_ID = '11-same-device-remote-presentation';
const DR2_TARGET_HEADING_ID = '111-flow-description';
const DR2_MERMAID_CHAPTER_ID = '28-bank-and-psp-integration-blueprint-eudi-wallet-compliance-hub';
const DR2_MERMAID_HEADING_ID = '2882-psp-specific-threat-profile';
const EXPANDED_MERMAID_RESET_ZOOM = 60;
const DR2_PILOT_CHAPTER_ID = '4-rp-registration-data-model-and-registrar-api';
const DR2_PILOT_HEADING_ID = '431-registration-sequence-diagram-direct-rp-model';
const DR2_MULTI_MERMAID_CHAPTER_ID = '15-proximity-presentation-flows-iso-18013-5-supervised-and-unsupervised';
const DR2_MULTI_MERMAID_HEADING_ID = '154-supervised-flow-sequence-diagram-direct-rp-model';
const DR2_ARF_CHAPTER_ID = '7-identifier-and-trust-model-x509-dids-and-the-wallet-landscape';
const DR2_ARF_HEADING_ID = '72-the-arf-mandate-x509-for-the-core-dids-optional-for-non-qualified-eaas';
const DR2_RULEBOOK_CHAPTER_ID = '6-credential-formats-sd-jwt-vc-mdoc-and-format-selection';
const DR1_LABEL_SOURCE_CHAPTER_ID = 'appendix-f-ibm-contextforge-batteries-included-mcp-gateway-with-safety-guardrails';
const DR1_LABEL_TARGET_CHAPTER_ID = '26-findings';
const DR1_LABEL_TARGET_HEADING_ID = 'finding-26';
const DR6_SLUG = 'DR-0006-modern-low-level-programming-languages';
const DR6_MEMORY_CHAPTER_ID = '5-memory-management-models';
const DR6_CONTROL_FLOW_CHAPTER_ID = '6-control-flow-loops-pattern-matching-branching';
const DR6_CERTIFICATION_CHAPTER_ID = '34-safety-critical-and-certification-support';
const DR6_EMBEDDED_CHAPTER_ID = '35-embedded-and-systems-programming';
const DR6_NETWORKING_CHAPTER_ID = '38-networking-and-cloud-native-support';
const DR6_OS_CHAPTER_ID = '39-os-and-system-level-programming';
const DR6_CPP_HEADING_ID = '522-c23-raii-and-smart-pointers';
const DR6_ZIG_HEADING_ID = '523-zig-014-explicit-allocators-and-defer';
const DR6_ADA_HEADING_ID = '524-ada-2022-controlled-types-and-storage-pools';
const DR6_NIM_STATIC_HEADING_ID = '685-compile-time-control-flow-static-and-macros';
const DR6_CERTIFICATION_TIER_HEADING_ID = '3461-certification-readiness-matrix';
const DR6_ZIG_HARDWARE_HEADING_ID = '3541-direct-hardware-access';
const DR6_EMBEDDED_TIER_HEADING_ID = '35101-tier-rankings';
const DR6_NETWORKING_RESTORE_HEADING_ID = '3871-backend-comparison';
const DR6_NETWORKING_HASH_HEADING_ID = '388-http3-and-quic-support';
const DR6_MEMORY_EXAMPLE_PERSIST_KEY = 'dr-0006-memory-management';
const DR6_MEMORY_EXAMPLE_GROUP_SELECTOR = `.chapter-article .tabbed-example-group[data-tabbed-example-persist="${DR6_MEMORY_EXAMPLE_PERSIST_KEY}"]`;
const DR6_TABBED_EXAMPLE_STORAGE_KEY = `dr-reader-tabbed-example:${DR6_MEMORY_EXAMPLE_PERSIST_KEY}`;
const DR6_MEMORY_STRATEGY_PERSIST_KEY = 'dr-0006-memory-strategy-models';
const DR6_MEMORY_STRATEGY_GROUP_SELECTOR = `.chapter-article .tabbed-example-group[data-tabbed-example-persist="${DR6_MEMORY_STRATEGY_PERSIST_KEY}"]`;
const DR6_MEMORY_STRATEGY_STORAGE_KEY = `dr-reader-tabbed-example:${DR6_MEMORY_STRATEGY_PERSIST_KEY}`;
const DR6_EMBEDDED_TIER_PERSIST_KEY = 'dr-0006-embedded-tier-rankings';
const DR6_EMBEDDED_TIER_GROUP_SELECTOR = `.chapter-article .tabbed-example-group[data-tabbed-example-persist="${DR6_EMBEDDED_TIER_PERSIST_KEY}"]`;
const DR6_CERTIFICATION_TIER_PERSIST_KEY = 'dr-0006-certification-readiness-tiers';
const DR6_CERTIFICATION_TIER_GROUP_SELECTOR = `.chapter-article .tabbed-example-group[data-tabbed-example-persist="${DR6_CERTIFICATION_TIER_PERSIST_KEY}"]`;
const DR6_DOCUMENT_MANIFEST_URL = new URL('../src/generated/documents/DR-0006-modern-low-level-programming-languages.json', import.meta.url);
const MERMAID_CLUSTER_LABEL_NODE_OVERLAP_Y_THRESHOLD = 8;
const MERMAID_CLUSTER_LABEL_NODE_OVERLAP_AREA_THRESHOLD = 1000;

function getDr6ContentChapterIds() {
  const manifest = JSON.parse(readFileSync(DR6_DOCUMENT_MANIFEST_URL, 'utf8'));
  return manifest.chapters
    .map((chapter) => chapter.chapterId)
    .filter((chapterId) => !chapterId.startsWith('part-'));
}

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

  const groupOverview = await page.evaluate(() => ({
    outlineHeading: document.querySelector('.chapter-outline-heading')?.textContent?.trim() ?? '',
    outlineLinks: [...document.querySelectorAll('.chapter-outline-sidebar .chapter-outline-link')].map((node) => ({
      text: node.textContent?.trim() ?? '',
      href: node.getAttribute('href') ?? '',
    })),
    inlineLinks: [...document.querySelectorAll('.chapter-group-link')].map((node) => ({
      text: node.textContent?.trim() ?? '',
      href: node.getAttribute('href') ?? '',
    })),
  }));

  if (
    groupOverview.outlineHeading !== 'Chapters in this group' ||
    groupOverview.outlineLinks.length < 2 ||
    groupOverview.inlineLinks.length !== groupOverview.outlineLinks.length
  ) {
    throw new Error(`group chapter overview missing chapter links: ${JSON.stringify(groupOverview)}`);
  }

  await page.locator(`.chapter-outline-sidebar a.chapter-outline-link[href='/${DOC_SLUG}/${FIRST_CHAPTER_ID}']`).click();

  await page.waitForFunction(({ slug, chapterId }) => (
    window.location.pathname === `/${slug}/${chapterId}` &&
    window.location.hash === '' &&
    document.querySelector('.chapter-nav-link.is-active')?.getAttribute('href') === `/${slug}/${chapterId}` &&
    document.querySelector('.chapter-outline-heading')?.textContent?.trim() === 'Table of contents'
  ), {
    slug: DOC_SLUG,
    chapterId: FIRST_CHAPTER_ID,
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

async function clearArticleScrollPositions(page) {
  await page.evaluate(() => {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith('dr-reader-scroll-position:v1:'))
      .forEach((key) => window.sessionStorage.removeItem(key));
  });
}

async function waitForHeadingNearReaderOffset(page, headingId) {
  await page.waitForFunction((targetHeadingId) => {
    const target = document.getElementById(targetHeadingId);
    const top = target?.getBoundingClientRect().top ?? null;
    return top != null && top >= 48 && top <= 180;
  }, headingId, { timeout: 20_000 });
}

async function assertArticleRefreshScrollRestoration(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${DR6_NETWORKING_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking article refresh scroll restoration: ${url}`);

  await clearArticleScrollPositions(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((headingId) => {
    const target = document.getElementById(headingId);
    return Boolean(document.querySelector('.chapter-article')) &&
      Boolean(target) &&
      window.scrollY <= 160 &&
      (target?.getBoundingClientRect().top ?? 0) > 500;
  }, DR6_NETWORKING_RESTORE_HEADING_ID, { timeout: 20_000 });
  await page.waitForTimeout(650);

  await page.evaluate((headingId) => {
    const target = document.getElementById(headingId);
    if (!target) {
      throw new Error(`missing heading: ${headingId}`);
    }

    const desiredTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 96);
    window.scrollTo({ top: desiredTop, behavior: 'auto' });
  }, DR6_NETWORKING_RESTORE_HEADING_ID);

  await waitForHeadingNearReaderOffset(page, DR6_NETWORKING_RESTORE_HEADING_ID);
  await page.waitForFunction(({ slug, chapterId, headingId }) => {
    const raw = window.sessionStorage.getItem(`dr-reader-scroll-position:v1:${slug}/${chapterId}`);
    if (!raw) {
      return false;
    }

    try {
      const stored = JSON.parse(raw);
      return stored.headingId === headingId && Number(stored.scrollY) > 500;
    } catch {
      return false;
    }
  }, {
    slug: DR6_SLUG,
    chapterId: DR6_NETWORKING_CHAPTER_ID,
    headingId: DR6_NETWORKING_RESTORE_HEADING_ID,
  }, { timeout: 20_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForHeadingNearReaderOffset(page, DR6_NETWORKING_RESTORE_HEADING_ID);

  const restoredSnapshot = await page.evaluate((headingId) => {
    const target = document.getElementById(headingId);
    return {
      scrollY: Math.round(window.scrollY),
      headingTop: Math.round(target?.getBoundingClientRect().top ?? -1),
    };
  }, DR6_NETWORKING_RESTORE_HEADING_ID);
  if (restoredSnapshot.scrollY <= 500) {
    throw new Error(`article refresh did not restore deep scroll position: ${JSON.stringify(restoredSnapshot)}`);
  }

  const hashUrl = `${url}#${DR6_NETWORKING_HASH_HEADING_ID}`;
  await page.goto(hashUrl, { waitUntil: 'domcontentloaded' });
  await waitForHeadingNearReaderOffset(page, DR6_NETWORKING_HASH_HEADING_ID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction((headingId) => window.location.hash === `#${headingId}`, DR6_NETWORKING_HASH_HEADING_ID, { timeout: 20_000 });
  await waitForHeadingNearReaderOffset(page, DR6_NETWORKING_HASH_HEADING_ID);

  await page.locator(`a.chapter-nav-link[href='/${DR6_SLUG}/${DR6_OS_CHAPTER_ID}']`).click();
  await page.waitForFunction(({ slug, chapterId }) => {
    const target = document.getElementById(chapterId);
    const top = target?.getBoundingClientRect().top ?? null;
    return window.location.pathname === `/${slug}/${chapterId}` &&
      window.location.hash === '' &&
      top != null &&
      top >= 0 &&
      top <= 180 &&
      window.scrollY <= 160;
  }, {
    slug: DR6_SLUG,
    chapterId: DR6_OS_CHAPTER_ID,
  }, { timeout: 20_000 });

  await page.goto(`${getBaseUrl(page.__readerPort)}/${DOC_SLUG}/${SECOND_CHAPTER_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(({ slug, chapterId }) => (
    window.location.pathname === `/${slug}/${chapterId}` &&
    window.location.hash === '' &&
    Boolean(document.querySelector('.chapter-article'))
  ), {
    slug: DOC_SLUG,
    chapterId: SECOND_CHAPTER_ID,
  }, { timeout: 20_000 });
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
    const isExplicit = window.localStorage.getItem('dr-reader-nav-width-explicit') === 'true';
    return !document.querySelector('.chapter-reader')?.classList.contains('is-resizing-nav') &&
      isExplicit &&
      Number.isFinite(stored) &&
      width >= minimumWidth &&
      Math.abs(width - stored) <= 2;
  }, beforeWidth + 12, { timeout: 20_000 });
}

async function assertLayoutWidthControls(page) {
  console.log('[chapter routes smoke] checking layout width controls and recommended reset');

  const readReaderMetrics = () => page.evaluate(() => {
    const reader = document.querySelector('.chapter-reader');
    const nav = document.querySelector('.chapter-nav-sidebar');
    const outline = document.querySelector('.chapter-outline-sidebar');
    return {
      mode: reader?.getAttribute('data-layout-width'),
      shellWidth: Math.round(reader?.getBoundingClientRect().width ?? 0),
      navWidth: Math.round(nav?.getBoundingClientRect().width ?? 0),
      outlineWidth: Math.round(outline?.getBoundingClientRect().width ?? 0),
      stored: window.localStorage.getItem('dr-reader-layout-width'),
    };
  });

  const openDisplaySettings = async () => {
    const popover = page.locator('.display-settings-popover');
    if (!(await popover.isVisible().catch(() => false))) {
      await page.locator('button[aria-label="Display settings"]').click();
      await popover.waitFor({ state: 'visible', timeout: 20_000 });
    }
  };
  const closeDisplaySettings = async () => {
    const popover = page.locator('.display-settings-popover');
    if (await popover.isVisible().catch(() => false)) {
      await page.locator('button[aria-label="Display settings"]').click();
      await popover.waitFor({ state: 'hidden', timeout: 20_000 });
    }
  };

  const clickLayoutOption = async (label) => {
    await openDisplaySettings();
    await page.locator('.display-settings-section').filter({ hasText: 'Layout Width' }).locator('button.text-size-option', { hasText: label }).click();
    await page.waitForTimeout(50);
  };

  await openDisplaySettings();
  await page.waitForFunction(() => (
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'wide' &&
    window.localStorage.getItem('dr-reader-layout-width') === 'recommended' &&
    [...document.querySelectorAll('.display-settings-section')]
      .find((section) => section.textContent?.includes('Layout Width'))
      ?.querySelector('.text-size-option.is-selected')
      ?.textContent?.trim() === 'Wide'
  ), null, { timeout: 20_000 });

  const recommendedMetrics = await readReaderMetrics();

  await clickLayoutOption('Standard');
  await page.waitForFunction(() => (
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'standard' &&
    window.localStorage.getItem('dr-reader-layout-width') === 'standard'
  ), null, { timeout: 20_000 });

  const standardMetrics = await readReaderMetrics();
  if (standardMetrics.shellWidth >= recommendedMetrics.shellWidth || standardMetrics.outlineWidth >= recommendedMetrics.outlineWidth) {
    throw new Error(`standard layout did not tighten desktop shell: recommended=${JSON.stringify(recommendedMetrics)}, standard=${JSON.stringify(standardMetrics)}`);
  }

  await clickLayoutOption('Comfort');
  await page.waitForFunction(() => (
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'comfort' &&
    window.localStorage.getItem('dr-reader-layout-width') === 'comfort'
  ), null, { timeout: 20_000 });

  const comfortMetrics = await readReaderMetrics();
  if (comfortMetrics.shellWidth <= standardMetrics.shellWidth || comfortMetrics.outlineWidth <= standardMetrics.outlineWidth) {
    throw new Error(`comfort layout did not broaden desktop shell: comfort=${JSON.stringify(comfortMetrics)}, standard=${JSON.stringify(standardMetrics)}`);
  }

  await openDisplaySettings();
  await page.locator('button.display-settings-reset').click();
  await openDisplaySettings();
  await page.waitForFunction(() => (
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'wide' &&
    window.localStorage.getItem('dr-reader-layout-width') === 'recommended' &&
    [...document.querySelectorAll('.display-settings-section')]
      .find((section) => section.textContent?.includes('Layout Width'))
      ?.querySelector('.text-size-option.is-selected')
      ?.textContent?.trim() === 'Wide'
  ), null, { timeout: 20_000 });
  await closeDisplaySettings();
}

async function assertLayoutWidthRespectsExplicitNavResize(page) {
  console.log('[chapter routes smoke] checking explicit left-nav resize precedence across layout width changes');

  const explicitWidth = await page.locator('.chapter-nav-sidebar').evaluate((node) => Math.round(node.getBoundingClientRect().width));
  const openDisplaySettings = async () => {
    const popover = page.locator('.display-settings-popover');
    if (!(await popover.isVisible().catch(() => false))) {
      await page.locator('button[aria-label="Display settings"]').click();
      await popover.waitFor({ state: 'visible', timeout: 20_000 });
    }
  };
  const closeDisplaySettings = async () => {
    const popover = page.locator('.display-settings-popover');
    if (await popover.isVisible().catch(() => false)) {
      await page.locator('button[aria-label="Display settings"]').click();
      await popover.waitFor({ state: 'hidden', timeout: 20_000 });
    }
  };

  await openDisplaySettings();
  await page.locator('.display-settings-section').filter({ hasText: 'Layout Width' }).locator('button.text-size-option', { hasText: 'Standard' }).click();

  await page.waitForFunction((expectedWidth) => {
    const width = Math.round(document.querySelector('.chapter-nav-sidebar')?.getBoundingClientRect().width ?? 0);
    return document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'standard' &&
      window.localStorage.getItem('dr-reader-layout-width') === 'standard' &&
      window.localStorage.getItem('dr-reader-nav-width-explicit') === 'true' &&
      Math.abs(width - expectedWidth) <= 2;
  }, explicitWidth, { timeout: 20_000 });

  await openDisplaySettings();
  await page.locator('button.display-settings-reset').click();
  await page.waitForFunction(() => (
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'wide' &&
    window.localStorage.getItem('dr-reader-layout-width') === 'recommended'
  ), null, { timeout: 20_000 });
  await closeDisplaySettings();
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

async function assertGeneratedCrossReferenceNavigation(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_SOURCE_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking generated cross-reference navigation: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const xref = page.locator(`a[data-doc-xref="true"][data-doc-chapter-id="${DR2_TARGET_CHAPTER_ID}"][data-doc-heading-id="${DR2_TARGET_HEADING_ID}"]`).first();
  await xref.waitFor({ state: 'visible', timeout: 20_000 });
  await xref.click();

  await page.waitForFunction(({ slug, chapterId, headingId }) => {
    const target = document.getElementById(headingId);
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      window.location.pathname === `/${slug}/${chapterId}` &&
      window.location.hash === `#${headingId}` &&
      top != null &&
      top >= 0 &&
      top <= 180
    );
  }, {
    slug: DR2_SLUG,
    chapterId: DR2_TARGET_CHAPTER_ID,
    headingId: DR2_TARGET_HEADING_ID,
  }, { timeout: 20_000 });
}

async function assertGeneratedLabelCrossReferenceNavigation(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DOC_SLUG}/${DR1_LABEL_SOURCE_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking generated label cross-reference navigation: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const xref = page.locator(`a[data-doc-xref="true"][data-doc-chapter-id="${DR1_LABEL_TARGET_CHAPTER_ID}"][data-doc-heading-id="${DR1_LABEL_TARGET_HEADING_ID}"]`).first();
  await xref.waitFor({ state: 'visible', timeout: 20_000 });
  await xref.click();

  await page.waitForFunction(({ slug, chapterId, headingId }) => {
    const target = document.getElementById(headingId);
    const top = target?.getBoundingClientRect().top ?? null;
    return (
      window.location.pathname === `/${slug}/${chapterId}` &&
      window.location.hash === `#${headingId}` &&
      top != null &&
      top >= 0 &&
      top <= 180
    );
  }, {
    slug: DOC_SLUG,
    chapterId: DR1_LABEL_TARGET_CHAPTER_ID,
    headingId: DR1_LABEL_TARGET_HEADING_ID,
  }, { timeout: 20_000 });
}

async function assertExternalLinksOpenInNewTab(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_RULEBOOK_CHAPTER_ID}#612-rp-relevant-rulebook-content`;
  console.log(`[chapter routes smoke] checking external links open in new tab: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const externalLink = page.locator('a[href^="https://github.com/eu-digital-identity-wallet/eudi-doc-attestation-rulebooks-catalog/blob/main/template/attestation-rulebook-template.md#2-attestation-attributes-and-metadata"]').first();
  await externalLink.waitFor({ state: 'visible', timeout: 20_000 });

  const target = await externalLink.getAttribute('target');
  const rel = await externalLink.getAttribute('rel');
  if (target !== '_blank' || !rel?.includes('noopener') || !rel?.includes('noreferrer')) {
    throw new Error(`external reader link missing new-tab safety attrs: target=${target}, rel=${rel}`);
  }

  const internalLink = page.locator('a[data-doc-xref="true"]').first();
  const internalTarget = await internalLink.getAttribute('target');
  if (internalTarget !== null) {
    throw new Error(`internal cross-reference unexpectedly opens in a new tab: target=${internalTarget}`);
  }
}

async function assertArfLinksResolveAsExternalLinks(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_ARF_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking ARF external links in viewer: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const qualifiedEaaLink = page.locator('a[href="https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#523-qualified-electronic-attestation-of-attributes-qeaa"]').first();
  await qualifiedEaaLink.waitFor({ state: 'visible', timeout: 20_000 });

  const qualifiedEaaTarget = await qualifiedEaaLink.getAttribute('target');
  const qualifiedEaaRel = await qualifiedEaaLink.getAttribute('rel');
  const qualifiedEaaXref = await qualifiedEaaLink.getAttribute('data-doc-xref');
  if (qualifiedEaaTarget !== '_blank' || !qualifiedEaaRel?.includes('noopener') || !qualifiedEaaRel?.includes('noreferrer')) {
    throw new Error(`ARF link missing new-tab safety attrs: target=${qualifiedEaaTarget}, rel=${qualifiedEaaRel}`);
  }
  if (qualifiedEaaXref !== null) {
    throw new Error(`ARF link was incorrectly marked as an internal cross-reference: data-doc-xref=${qualifiedEaaXref}`);
  }

  const carryForwardLink = page.locator('a[href="https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#61-scope"]').first();
  await carryForwardLink.waitFor({ state: 'visible', timeout: 20_000 });

  const carryForwardText = await carryForwardLink.textContent();
  const carryForwardXref = await carryForwardLink.getAttribute('data-doc-xref');
  if (carryForwardText?.trim() !== '§6.1') {
    throw new Error(`ARF carry-forward link rendered unexpected text: ${JSON.stringify(carryForwardText)}`);
  }
  if (carryForwardXref !== null) {
    throw new Error(`ARF carry-forward link was incorrectly marked as an internal cross-reference: data-doc-xref=${carryForwardXref}`);
  }

  const chapterSummaryItem = page.locator('li', { hasText: 'authoritative clarification from the ARF team' }).first();
  const chapterSummaryLink = chapterSummaryItem.locator(`a[data-doc-xref="true"][data-doc-chapter-id="${DR2_ARF_CHAPTER_ID}"][data-doc-heading-id="${DR2_ARF_HEADING_ID}"]`).first();
  await chapterSummaryLink.waitFor({ state: 'visible', timeout: 20_000 });

  const chapterSummaryHref = await chapterSummaryLink.getAttribute('href');
  const chapterSummaryText = await chapterSummaryLink.textContent();
  if (chapterSummaryText?.trim() !== '§7.2') {
    throw new Error(`chapter-summary internal link rendered unexpected text: ${JSON.stringify(chapterSummaryText)}`);
  }
  if (chapterSummaryHref !== `/${DR2_SLUG}/${DR2_ARF_CHAPTER_ID}#${DR2_ARF_HEADING_ID}`) {
    throw new Error(`chapter-summary internal link rendered unexpected href: ${chapterSummaryHref}`);
  }

  const interoperabilityItem = page.locator('li', { hasText: 'Interoperability mandate' }).first();
  const interoperabilityLink = interoperabilityItem.locator('a[href="https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#423-interoperability"]').first();
  await interoperabilityLink.waitFor({ state: 'visible', timeout: 20_000 });

  const interoperabilityText = await interoperabilityLink.textContent();
  const interoperabilityTarget = await interoperabilityLink.getAttribute('target');
  const interoperabilityRel = await interoperabilityLink.getAttribute('rel');
  const interoperabilityXref = await interoperabilityLink.getAttribute('data-doc-xref');
  if (interoperabilityText?.trim() !== '§4.2.3') {
    throw new Error(`ARF interoperability link rendered unexpected text: ${JSON.stringify(interoperabilityText)}`);
  }
  if (interoperabilityTarget !== '_blank' || !interoperabilityRel?.includes('noopener') || !interoperabilityRel?.includes('noreferrer')) {
    throw new Error(`ARF interoperability link missing new-tab safety attrs: target=${interoperabilityTarget}, rel=${interoperabilityRel}`);
  }
  if (interoperabilityXref !== null) {
    throw new Error(`ARF interoperability link was incorrectly marked as an internal cross-reference: data-doc-xref=${interoperabilityXref}`);
  }
}

async function assertArfTopicLinksResolveAsExternalLinks(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_MERMAID_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking ARF topic links in viewer: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const topicLink = page.locator('a[href="https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a2330-topic-52-relying-party-intermediaries"]').first();
  await topicLink.waitFor({ state: 'visible', timeout: 20_000 });

  const topicText = await topicLink.textContent();
  const topicTarget = await topicLink.getAttribute('target');
  const topicRel = await topicLink.getAttribute('rel');
  const topicXref = await topicLink.getAttribute('data-doc-xref');
  if (topicText?.trim() !== 'ARF Topic 52') {
    throw new Error(`ARF topic link rendered unexpected text: ${JSON.stringify(topicText)}`);
  }
  if (topicTarget !== '_blank' || !topicRel?.includes('noopener') || !topicRel?.includes('noreferrer')) {
    throw new Error(`ARF topic link missing new-tab safety attrs: target=${topicTarget}, rel=${topicRel}`);
  }
  if (topicXref !== null) {
    throw new Error(`ARF topic link was incorrectly marked as an internal cross-reference: data-doc-xref=${topicXref}`);
  }
}

async function assertInitialHashRouteSurvivesMermaidRender(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_MERMAID_CHAPTER_ID}#${DR2_MERMAID_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking initial hash route after mermaid render: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(({ slug, chapterId, headingId }) => {
    const target = document.getElementById(headingId);
    const top = target?.getBoundingClientRect().top ?? null;
    const renderedMermaids = document.querySelectorAll('.doc-article svg[id^="mermaid-"]').length;
    return (
      window.location.pathname === `/${slug}/${chapterId}` &&
      window.location.hash === `#${headingId}` &&
      renderedMermaids >= 1 &&
      top != null &&
      top >= 0 &&
      top <= 180
    );
  }, {
    slug: DR2_SLUG,
    chapterId: DR2_MERMAID_CHAPTER_ID,
    headingId: DR2_MERMAID_HEADING_ID,
  }, { timeout: 20_000 });
}

async function assertViewerSuppressesStandaloneBreakSpacers(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/appendix-d-rp-security-threat-card-catalogue#d21-rp-driven-credential-phishing-and-os-spying`;
  console.log(`[chapter routes smoke] checking standalone break spacers are suppressed in viewer: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const article = document.querySelector('.chapter-article');
    if (!(article instanceof HTMLElement)) {
      return false;
    }

    const topLevelBreak = Array.from(article.children).find((node) => (
      node instanceof HTMLBRElement &&
      node.previousElementSibling?.tagName === 'DETAILS' &&
      node.nextElementSibling?.tagName === 'P'
    ));

    if (!(topLevelBreak instanceof HTMLBRElement)) {
      return false;
    }

    return window.getComputedStyle(topLevelBreak).display === 'none';
  }, null, { timeout: 20_000 });
}

async function readTabbedExampleSnapshot(page) {
  return page.evaluate((groupSelector) => {
    const group = document.querySelector(groupSelector);
    const buttons = [...group?.querySelectorAll('[role="tab"][data-tabbed-example-key]') ?? []];
    const panels = [...group?.querySelectorAll('.tabbed-example-panel[data-tabbed-example-panel]') ?? []];
    const activePanel = panels.find((panel) => !panel.hidden);
    const activeOutline = document.querySelector('.chapter-outline-link.is-active');

    return {
      hasGroup: Boolean(group),
      title: group?.querySelector('.tabbed-example-title')?.textContent?.trim() ?? '',
      selectedKeys: buttons
        .filter((button) => button.getAttribute('aria-selected') === 'true')
        .map((button) => button.getAttribute('data-tabbed-example-key')),
      tabIndexes: buttons.map((button) => ({
        key: button.getAttribute('data-tabbed-example-key'),
        tabIndex: button.getAttribute('tabindex'),
      })),
      hiddenKeys: panels
        .filter((panel) => panel.hidden)
        .map((panel) => panel.getAttribute('data-tabbed-example-key')),
      activePanelKey: activePanel?.getAttribute('data-tabbed-example-key') ?? null,
      activePanelHeadingId: activePanel?.querySelector('h5, h6')?.id ?? null,
      hasCppAnchor: Boolean(document.getElementById('522-c23-raii-and-smart-pointers')),
      hasZigAnchor: Boolean(document.getElementById('523-zig-014-explicit-allocators-and-defer')),
      hasAdaAnchor: Boolean(document.getElementById('524-ada-2022-controlled-types-and-storage-pools')),
      activeOutlineText: activeOutline?.textContent?.trim() ?? '',
      storedKey: window.localStorage.getItem('dr-reader-tabbed-example:dr-0006-memory-management'),
    };
  }, DR6_MEMORY_EXAMPLE_GROUP_SELECTOR);
}

async function assertTabbedExamplePilot(page) {
  const baseUrl = getBaseUrl(page.__readerPort);
  const chapterUrl = `${baseUrl}/${DR6_SLUG}/${DR6_MEMORY_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking tabbed example pilot: ${chapterUrl}`);

  await page.goto(`${chapterUrl}#${DR6_CPP_HEADING_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((groupSelector) => {
    const group = document.querySelector(groupSelector);
    const selected = group?.querySelector('[role="tab"][aria-selected="true"]');
    return selected?.getAttribute('data-tabbed-example-key') === 'cpp' &&
      !document.getElementById('522-c23-raii-and-smart-pointers')?.closest('.tabbed-example-panel')?.hidden;
  }, DR6_MEMORY_EXAMPLE_GROUP_SELECTOR, { timeout: 20_000 });

  const initialSnapshot = await readTabbedExampleSnapshot(page);
  if (
    !initialSnapshot.hasGroup ||
    initialSnapshot.title !== 'Manual memory management examples' ||
    initialSnapshot.selectedKeys.join(',') !== 'cpp' ||
    initialSnapshot.activePanelKey !== 'cpp' ||
    initialSnapshot.activePanelHeadingId !== DR6_CPP_HEADING_ID ||
    !initialSnapshot.hiddenKeys.includes('zig') ||
    !initialSnapshot.hiddenKeys.includes('ada') ||
    !initialSnapshot.hasCppAnchor ||
    !initialSnapshot.hasZigAnchor ||
    !initialSnapshot.hasAdaAnchor ||
    initialSnapshot.tabIndexes.find((entry) => entry.key === 'cpp')?.tabIndex !== '0' ||
    initialSnapshot.tabIndexes.find((entry) => entry.key === 'zig')?.tabIndex !== '-1'
  ) {
    throw new Error(`tabbed example initial state invalid: ${JSON.stringify(initialSnapshot)}`);
  }

  await page.locator(`${DR6_MEMORY_EXAMPLE_GROUP_SELECTOR} .tabbed-example-tab[data-tabbed-example-key="zig"]`).click();
  await page.waitForFunction(() => (
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="zig"]')?.getAttribute('aria-selected') === 'true' &&
    !document.getElementById('523-zig-014-explicit-allocators-and-defer')?.closest('.tabbed-example-panel')?.hidden &&
    window.localStorage.getItem('dr-reader-tabbed-example:dr-0006-memory-management') === 'zig'
  ), null, { timeout: 20_000 });

  await page.keyboard.press('End');
  await page.waitForFunction(() => (
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="ada"]')?.getAttribute('aria-selected') === 'true' &&
    document.activeElement?.getAttribute('data-tabbed-example-key') === 'ada'
  ), null, { timeout: 20_000 });

  await page.keyboard.press('Home');
  await page.waitForFunction(() => (
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="cpp"]')?.getAttribute('aria-selected') === 'true' &&
    document.activeElement?.getAttribute('data-tabbed-example-key') === 'cpp'
  ), null, { timeout: 20_000 });

  await page.locator(`${DR6_MEMORY_EXAMPLE_GROUP_SELECTOR} .tabbed-example-tab[data-tabbed-example-key="zig"]`).click();
  await page.goto(chapterUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((storageKey) => (
    window.localStorage.getItem(storageKey) === 'zig' &&
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="zig"]')?.getAttribute('aria-selected') === 'true'
  ), DR6_TABBED_EXAMPLE_STORAGE_KEY, { timeout: 20_000 });

  await page.goto(`${chapterUrl}#${DR6_ADA_HEADING_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="ada"]')?.getAttribute('aria-selected') === 'true' &&
    !document.getElementById('524-ada-2022-controlled-types-and-storage-pools')?.closest('.tabbed-example-panel')?.hidden
  ), null, { timeout: 20_000 });

  await page.locator('.chapter-outline-link', { hasText: '5.2.3 Zig 0.14' }).click();
  await page.waitForFunction(() => (
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="zig"]')?.getAttribute('aria-selected') === 'true' &&
    !document.getElementById('523-zig-014-explicit-allocators-and-defer')?.closest('.tabbed-example-panel')?.hidden
  ), null, { timeout: 20_000 });

  await page.evaluate(({ chapterId, headingId }) => {
    const article = document.querySelector('.chapter-article');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Synthetic same-chapter Ada link';
    link.dataset.docXref = 'true';
    link.dataset.docChapterId = chapterId;
    link.dataset.docHeadingId = headingId;
    article.prepend(link);
  }, {
    chapterId: DR6_MEMORY_CHAPTER_ID,
    headingId: DR6_ADA_HEADING_ID,
  });

  await page.locator('a', { hasText: 'Synthetic same-chapter Ada link' }).click();
  await page.waitForFunction(() => (
    document.querySelector('[data-tabbed-example-persist="dr-0006-memory-management"] .tabbed-example-tab[data-tabbed-example-key="ada"]')?.getAttribute('aria-selected') === 'true' &&
    !document.getElementById('524-ada-2022-controlled-types-and-storage-pools')?.closest('.tabbed-example-panel')?.hidden
  ), null, { timeout: 20_000 });

  await page.waitForFunction(() => (
    document.querySelector('.chapter-outline-link.is-active')?.textContent?.includes('5.2.4 Ada 2022')
  ), null, { timeout: 20_000 });

  const finalSnapshot = await readTabbedExampleSnapshot(page);
  if (finalSnapshot.activeOutlineText.includes('Zig') && finalSnapshot.activePanelKey !== 'zig') {
    throw new Error(`hidden tab heading incorrectly drove active outline state: ${JSON.stringify(finalSnapshot)}`);
  }
}

async function readTabbedMermaidSnapshot(page) {
  return page.evaluate(({ groupSelector, storageKey }) => {
    const group = document.querySelector(groupSelector);
    const buttons = [...group?.querySelectorAll('[role="tab"][data-tabbed-example-key]') ?? []];
    const panels = [...group?.querySelectorAll('.tabbed-example-panel[data-tabbed-example-panel]') ?? []];
    const activePanel = panels.find((panel) => !panel.hidden);

    return {
      hasGroup: Boolean(group),
      title: group?.querySelector('.tabbed-example-title')?.textContent?.trim() ?? '',
      selectedKeys: buttons
        .filter((button) => button.getAttribute('aria-selected') === 'true')
        .map((button) => button.getAttribute('data-tabbed-example-key')),
      tabKeys: buttons.map((button) => button.getAttribute('data-tabbed-example-key')),
      hiddenKeys: panels
        .filter((panel) => panel.hidden)
        .map((panel) => panel.getAttribute('data-tabbed-example-key')),
      activePanelKey: activePanel?.getAttribute('data-tabbed-example-key') ?? null,
      activeSvgCount: activePanel?.querySelectorAll('.mermaid svg').length ?? 0,
      activeExpandButtonCount: activePanel?.querySelectorAll('.mermaid .mermaid-expand-button').length ?? 0,
      activeZoomDisplayText: activePanel?.querySelector('.mermaid-zoom-display')?.textContent?.trim() ?? '',
      storedKey: window.localStorage.getItem(storageKey),
    };
  }, {
    groupSelector: DR6_MEMORY_STRATEGY_GROUP_SELECTOR,
    storageKey: DR6_MEMORY_STRATEGY_STORAGE_KEY,
  });
}

async function assertTabbedMermaidPilot(page) {
  const chapterUrl = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${DR6_MEMORY_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking tabbed Mermaid pilot: ${chapterUrl}`);

  await page.goto(chapterUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((groupSelector) => {
    const group = document.querySelector(groupSelector);
    const activePanel = group?.querySelector('.tabbed-example-panel:not([hidden])');
    return group?.querySelector('[role="tab"][aria-selected="true"][data-tabbed-example-key="control"]') &&
      activePanel?.querySelector('.mermaid svg') &&
      activePanel?.querySelector('.mermaid .mermaid-expand-button');
  }, DR6_MEMORY_STRATEGY_GROUP_SELECTOR, { timeout: 20_000 });

  const initialSnapshot = await readTabbedMermaidSnapshot(page);
  if (
    !initialSnapshot.hasGroup ||
    initialSnapshot.title !== 'Memory management strategy models' ||
    initialSnapshot.selectedKeys.join(',') !== 'control' ||
    initialSnapshot.activePanelKey !== 'control' ||
    initialSnapshot.activeSvgCount < 1 ||
    initialSnapshot.activeExpandButtonCount < 1 ||
    initialSnapshot.activeZoomDisplayText !== '60%' ||
    !initialSnapshot.hiddenKeys.includes('safety') ||
    !initialSnapshot.hiddenKeys.includes('productivity')
  ) {
    throw new Error(`tabbed Mermaid initial state invalid: ${JSON.stringify(initialSnapshot)}`);
  }

  await page.locator(`${DR6_MEMORY_STRATEGY_GROUP_SELECTOR} .tabbed-example-tab[data-tabbed-example-key="safety"]`).click();
  await page.waitForFunction((storageKey) => {
    const group = document.querySelector('[data-tabbed-example-persist="dr-0006-memory-strategy-models"]');
    const activePanel = group?.querySelector('.tabbed-example-panel:not([hidden])');
    return group?.querySelector('[role="tab"][aria-selected="true"][data-tabbed-example-key="safety"]') &&
      activePanel?.getAttribute('data-tabbed-example-key') === 'safety' &&
      activePanel?.querySelector('.mermaid svg') &&
      window.localStorage.getItem(storageKey) === 'safety';
  }, DR6_MEMORY_STRATEGY_STORAGE_KEY, { timeout: 20_000 });

  await page.locator(`${DR6_MEMORY_STRATEGY_GROUP_SELECTOR} .tabbed-example-tab[data-tabbed-example-key="productivity"]`).click();
  await page.waitForFunction((storageKey) => {
    const group = document.querySelector('[data-tabbed-example-persist="dr-0006-memory-strategy-models"]');
    const activePanel = group?.querySelector('.tabbed-example-panel:not([hidden])');
    return group?.querySelector('[role="tab"][aria-selected="true"][data-tabbed-example-key="productivity"]') &&
      activePanel?.getAttribute('data-tabbed-example-key') === 'productivity' &&
      activePanel?.querySelector('.mermaid svg') &&
      window.localStorage.getItem(storageKey) === 'productivity';
  }, DR6_MEMORY_STRATEGY_STORAGE_KEY, { timeout: 20_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const group = document.querySelector('[data-tabbed-example-persist="dr-0006-memory-strategy-models"]');
    const activePanel = group?.querySelector('.tabbed-example-panel:not([hidden])');
    return group?.querySelector('[role="tab"][aria-selected="true"][data-tabbed-example-key="productivity"]') &&
      activePanel?.getAttribute('data-tabbed-example-key') === 'productivity' &&
      activePanel?.querySelector('.mermaid svg');
  }, null, { timeout: 20_000 });
}

async function assertEmbeddedTierRankingTabs(page) {
  const chapterUrl = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${DR6_EMBEDDED_CHAPTER_ID}`;
  console.log(`[chapter routes smoke] checking embedded tier ranking tabs: ${chapterUrl}`);

  await page.goto(`${chapterUrl}#${DR6_EMBEDDED_TIER_HEADING_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((groupSelector) => {
    const group = document.querySelector(groupSelector);
    const activePanel = group?.querySelector('.tabbed-example-panel:not([hidden])');
    return group?.querySelector('[role="tab"][aria-selected="true"]') &&
      activePanel?.querySelector('.mermaid svg');
  }, DR6_EMBEDDED_TIER_GROUP_SELECTOR, { timeout: 20_000 });

  const tabKeys = ['tier-1', 'tier-2', 'tier-3', 'tier-4'];
  for (const key of tabKeys) {
    await page.locator(`${DR6_EMBEDDED_TIER_GROUP_SELECTOR} [role="tab"][data-tabbed-example-key="${key}"]`).click();
    await page.waitForFunction(({ groupSelector, expectedKey }) => {
      const group = document.querySelector(groupSelector);
      const activePanel = group?.querySelector(`.tabbed-example-panel[data-tabbed-example-key="${expectedKey}"]`);
      return group?.querySelector(`[role="tab"][aria-selected="true"][data-tabbed-example-key="${expectedKey}"]`) &&
        activePanel &&
        !activePanel.hidden &&
        activePanel.querySelector('.mermaid svg');
    }, { groupSelector: DR6_EMBEDDED_TIER_GROUP_SELECTOR, expectedKey: key }, { timeout: 20_000 });

    const snapshot = await page.evaluate(({ groupSelector, expectedKey }) => {
      const group = document.querySelector(groupSelector);
      const tablist = group?.querySelector('.tabbed-example-tablist');
      const tablistRect = tablist?.getBoundingClientRect();
      const activePanel = group?.querySelector(`.tabbed-example-panel[data-tabbed-example-key="${expectedKey}"]`);
      const scrollShell = activePanel?.querySelector('.mermaid-scroll-shell');
      const buttons = [...group?.querySelectorAll('[role="tab"][data-tabbed-example-key]') ?? []];
      const tabButtons = buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          key: button.getAttribute('data-tabbed-example-key'),
          text: (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
          visible: tablistRect
            ? rect.left >= tablistRect.left - 1 && rect.right <= tablistRect.right + 1
            : false,
        };
      });

      return {
        title: group?.querySelector('.tabbed-example-title')?.textContent?.trim() ?? '',
        selectedKeys: buttons
          .filter((button) => button.getAttribute('aria-selected') === 'true')
          .map((button) => button.getAttribute('data-tabbed-example-key')),
        activePanelKey: activePanel?.getAttribute('data-tabbed-example-key') ?? null,
        activeSvgCount: activePanel?.querySelectorAll('.mermaid svg').length ?? 0,
        tablistHorizontalOverflowPx: Math.max(0, (tablist?.scrollWidth ?? 0) - (tablist?.clientWidth ?? 0)),
        diagramHorizontalOverflowPx: Math.max(0, (scrollShell?.scrollWidth ?? 0) - (scrollShell?.clientWidth ?? 0)),
        tabButtons,
      };
    }, { groupSelector: DR6_EMBEDDED_TIER_GROUP_SELECTOR, expectedKey: key });

    if (
      snapshot.title !== 'Embedded tier ranking details' ||
      snapshot.selectedKeys.join(',') !== key ||
      snapshot.activePanelKey !== key ||
      snapshot.activeSvgCount !== 1 ||
      snapshot.tablistHorizontalOverflowPx > 1 ||
      snapshot.diagramHorizontalOverflowPx > 1 ||
      snapshot.tabButtons.some((button) => !button.visible)
    ) {
      throw new Error(`embedded tier ranking tab layout invalid for ${key}: ${JSON.stringify(snapshot)}`);
    }

    const clippingSnapshot = await readMermaidForeignObjectClippingSnapshot(
      page,
      `${DR6_EMBEDDED_TIER_GROUP_SELECTOR} .tabbed-example-panel[data-tabbed-example-key="${key}"] .mermaid`,
    );
    if (!clippingSnapshot.hasSvg || clippingSnapshot.clipped.length > 0) {
      throw new Error(`embedded tier ranking labels clipped for ${key}: ${JSON.stringify(clippingSnapshot)}`);
    }
  }
}

async function assertCodeSyntaxHighlighting(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${DR6_EMBEDDED_CHAPTER_ID}#${DR6_ZIG_HARDWARE_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking Zig syntax highlighting: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((headingId) => {
    const heading = document.getElementById(headingId);
    let node = heading;
    while (node && node.tagName !== 'PRE') {
      node = node.nextElementSibling;
    }
    const code = node?.querySelector('code.language-zig');
    return Boolean(code?.querySelector('.hljs-keyword')) &&
      Boolean(code?.querySelector('.hljs-type')) &&
      Boolean(code?.querySelector('.hljs-built_in'));
  }, DR6_ZIG_HARDWARE_HEADING_ID, { timeout: 20_000 });

  const highlightSnapshot = await page.evaluate((headingId) => {
    const heading = document.getElementById(headingId);
    let node = heading;
    while (node && node.tagName !== 'PRE') {
      node = node.nextElementSibling;
    }
    const code = node?.querySelector('code.language-zig');
    const keyword = code?.querySelector('.hljs-keyword');
    const type = code?.querySelector('.hljs-type');
    const builtin = code?.querySelector('.hljs-built_in');
    return {
      codeClass: code?.className ?? '',
      spanCount: code?.querySelectorAll('span').length ?? 0,
      baseColor: code ? window.getComputedStyle(code).color : '',
      keywordColor: keyword ? window.getComputedStyle(keyword).color : '',
      typeColor: type ? window.getComputedStyle(type).color : '',
      builtinColor: builtin ? window.getComputedStyle(builtin).color : '',
    };
  }, DR6_ZIG_HARDWARE_HEADING_ID);

  if (
    highlightSnapshot.spanCount < 6 ||
    highlightSnapshot.keywordColor === highlightSnapshot.baseColor ||
    highlightSnapshot.typeColor === highlightSnapshot.baseColor ||
    highlightSnapshot.builtinColor === highlightSnapshot.baseColor
  ) {
    throw new Error(`Zig syntax highlighting is not visible: ${JSON.stringify(highlightSnapshot)}`);
  }
}

async function assertNimSyntaxHighlighting(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${DR6_CONTROL_FLOW_CHAPTER_ID}#${DR6_NIM_STATIC_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking Nim syntax highlighting: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((headingId) => {
    const heading = document.getElementById(headingId);
    let node = heading;
    while (node && node.tagName !== 'PRE') {
      node = node.nextElementSibling;
    }
    const code = node?.querySelector('code.language-nim');
    return Boolean(code?.querySelector('.hljs-keyword')) &&
      Boolean(code?.querySelector('.hljs-type')) &&
      Boolean(code?.querySelector('.hljs-number'));
  }, DR6_NIM_STATIC_HEADING_ID, { timeout: 20_000 });

  const highlightSnapshot = await page.evaluate((headingId) => {
    const heading = document.getElementById(headingId);
    let node = heading;
    while (node && node.tagName !== 'PRE') {
      node = node.nextElementSibling;
    }
    const code = node?.querySelector('code.language-nim');
    const keyword = code?.querySelector('.hljs-keyword');
    const type = code?.querySelector('.hljs-type');
    const number = code?.querySelector('.hljs-number');
    return {
      codeClass: code?.className ?? '',
      spanCount: code?.querySelectorAll('span').length ?? 0,
      baseColor: code ? window.getComputedStyle(code).color : '',
      keywordColor: keyword ? window.getComputedStyle(keyword).color : '',
      typeColor: type ? window.getComputedStyle(type).color : '',
      numberColor: number ? window.getComputedStyle(number).color : '',
    };
  }, DR6_NIM_STATIC_HEADING_ID);

  if (
    highlightSnapshot.spanCount < 10 ||
    highlightSnapshot.keywordColor === highlightSnapshot.baseColor ||
    highlightSnapshot.typeColor === highlightSnapshot.baseColor ||
    highlightSnapshot.numberColor === highlightSnapshot.baseColor
  ) {
    throw new Error(`Nim syntax highlighting is not visible: ${JSON.stringify(highlightSnapshot)}`);
  }
}

async function ensureTheme(page, expectedTheme) {
  const currentTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? 'dark');
  if (currentTheme === expectedTheme) {
    return;
  }

  await page.locator('button.theme-toggle').click();
  await page.waitForFunction((theme) => document.documentElement.dataset.theme === theme, expectedTheme, { timeout: 20_000 });
}

async function tagMermaidContainerForHeading(page, headingId, tagName) {
  const tagged = await page.evaluate(({ headingId: requestedHeadingId, tagName: requestedTagName }) => {
    const heading = document.getElementById(requestedHeadingId);
    let container = heading?.nextElementSibling ?? null;
    while (container && !(container instanceof HTMLElement && container.matches('.mermaid'))) {
      if (/^H[1-6]$/.test(container.tagName)) {
        container = null;
        break;
      }
      container = container.nextElementSibling;
    }

    if (!(container instanceof HTMLElement)) {
      return false;
    }

    container.setAttribute('data-test-mermaid-target', requestedTagName);
    return true;
  }, { headingId, tagName });

  if (!tagged) {
    throw new Error(`failed to tag Mermaid container for heading ${headingId}`);
  }
}

async function tagMermaidContainerByIndex(page, index, tagName) {
  const tagged = await page.evaluate(({ requestedIndex, requestedTagName }) => {
    const container = document.querySelectorAll('.chapter-article .mermaid')[requestedIndex];
    if (!(container instanceof HTMLElement)) {
      return false;
    }

    container.setAttribute('data-test-mermaid-target', requestedTagName);
    return true;
  }, { requestedIndex: index, requestedTagName: tagName });

  if (!tagged) {
    throw new Error(`failed to tag Mermaid container at index ${index}`);
  }
}

async function readTaggedMermaidSnapshot(page, tagName) {
  return page.evaluate((requestedTagName) => {
    const container = document.querySelector(`[data-test-mermaid-target="${requestedTagName}"]`);
    const scrollShell = container?.querySelector('.mermaid-scroll-shell');
    const svg = container?.querySelector('svg');
    const textNode = svg?.querySelector('.noteText, text, tspan');
    const actorBox = svg?.querySelector('rect.actor');
    const line = svg?.querySelector('.actor-line, .messageLine0, .messageLine1, .flowchart-link');
    const sequenceNumber = svg?.querySelector('.sequenceNumber');
    const sequenceBadge = svg?.querySelector("marker[id$='sequencenumber'] circle");
    const scrollHint = container?.querySelector('.mermaid-scroll-hint');
    const expandButton = container?.querySelector('.mermaid-expand-button');
    const zoomOutButton = container?.querySelector('button[data-mermaid-action="zoom-out"]');
    const zoomInButton = container?.querySelector('button[data-mermaid-action="zoom-in"]');
    const zoomDisplay = container?.querySelector('.mermaid-zoom-display');

    return {
      theme: document.documentElement.dataset.theme,
      containerTheme: container?.dataset.mermaidTheme ?? null,
      hasSvg: Boolean(svg),
      hasFallbackSource: (container?.textContent ?? '').includes('sequenceDiagram'),
      hasExpandButton: Boolean(expandButton),
      hasZoomOutButton: Boolean(zoomOutButton),
      hasZoomInButton: Boolean(zoomInButton),
      zoomDisplay: zoomDisplay?.textContent?.trim() ?? null,
      zoom: Number(container?.dataset.mermaidZoom ?? '0'),
      isOverflowing: container?.dataset.mermaidOverflowing ?? null,
      isPannable: container?.dataset.mermaidPannable ?? null,
      overflowRight: container?.dataset.mermaidOverflowRight ?? null,
      scrollLeft: Math.round(scrollShell?.scrollLeft ?? 0),
      scrollTop: Math.round(scrollShell?.scrollTop ?? 0),
      textFill: textNode ? window.getComputedStyle(textNode).fill : null,
      actorBoxFill: actorBox ? window.getComputedStyle(actorBox).fill : null,
      lineStroke: line ? window.getComputedStyle(line).stroke : null,
      sequenceNumberFill: sequenceNumber ? window.getComputedStyle(sequenceNumber).fill : null,
      sequenceBadgeFill: sequenceBadge ? window.getComputedStyle(sequenceBadge).fill : null,
      scrollHintOpacity: scrollHint ? window.getComputedStyle(scrollHint).opacity : null,
    };
  }, tagName);
}

async function openDisplaySettings(page) {
  const popover = page.locator('.display-settings-popover');
  if (!(await popover.isVisible().catch(() => false))) {
    await page.locator('button[aria-label="Display settings"]').click();
    await popover.waitFor({ state: 'visible', timeout: 20_000 });
  }
}

async function closeDisplaySettings(page) {
  const popover = page.locator('.display-settings-popover');
  if (await popover.isVisible().catch(() => false)) {
    await page.locator('button[aria-label="Display settings"]').click();
    await popover.waitFor({ state: 'hidden', timeout: 20_000 });
  }
}

async function readMermaidPresentationSnapshot(page) {
  return page.evaluate((headingId) => {
    const heading = document.getElementById(headingId);
    let container = heading?.nextElementSibling ?? null;
    while (container && !(container instanceof HTMLElement && container.matches('.mermaid'))) {
      if (/^H[1-6]$/.test(container.tagName)) {
        container = null;
        break;
      }
      container = container.nextElementSibling;
    }
    const svg = container?.querySelector('svg');
    const textNode = svg?.querySelector('.noteText, text, tspan');
    const actorBox = svg?.querySelector('rect.actor');
    const line = svg?.querySelector('.actor-line, .messageLine0, .messageLine1, .flowchart-link');
    const sequenceNumber = svg?.querySelector('.sequenceNumber');
    const sequenceBadge = svg?.querySelector("marker[id$='sequencenumber'] circle");
    const scrollHint = container?.querySelector('.mermaid-scroll-hint');
    const expandButton = container?.querySelector('.mermaid-expand-button');

    return {
      theme: document.documentElement.dataset.theme,
      containerTheme: container?.dataset.mermaidTheme ?? null,
      hasSvg: Boolean(svg),
      hasFallbackSource: (container?.textContent ?? '').includes('sequenceDiagram'),
      hasExpandButton: Boolean(expandButton),
      isOverflowing: container?.dataset.mermaidOverflowing ?? null,
      overflowRight: container?.dataset.mermaidOverflowRight ?? null,
      textFill: textNode ? window.getComputedStyle(textNode).fill : null,
      actorBoxFill: actorBox ? window.getComputedStyle(actorBox).fill : null,
      lineStroke: line ? window.getComputedStyle(line).stroke : null,
      sequenceNumberFill: sequenceNumber ? window.getComputedStyle(sequenceNumber).fill : null,
      sequenceBadgeFill: sequenceBadge ? window.getComputedStyle(sequenceBadge).fill : null,
      scrollHintOpacity: scrollHint ? window.getComputedStyle(scrollHint).opacity : null,
    };
  }, DR2_PILOT_HEADING_ID);
}

async function readExpandedMermaidSnapshot(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('.mermaid-modal');
    const diagram = modal?.querySelector('.mermaid-modal-diagram');
    const scrollShell = diagram?.querySelector('.mermaid-scroll-shell');
    const svg = diagram?.querySelector('svg');
    const textNode = svg?.querySelector('.noteText, text, tspan');
    const actorBox = svg?.querySelector('rect.actor');
    const line = svg?.querySelector('.actor-line, .messageLine0, .messageLine1, .flowchart-link');
    const copyImageButton = Array.from(modal?.querySelectorAll('.mermaid-modal-button') ?? [])
      .find((node) => (node.textContent ?? '').includes('Copy image') || (node.textContent ?? '').includes('Copied image'));

    return {
      isOpen: Boolean(modal),
      title: modal?.querySelector('h2')?.textContent ?? null,
      hasSvg: Boolean(svg),
      hasFallbackSource: (diagram?.textContent ?? '').includes('sequenceDiagram'),
      modalTheme: diagram?.dataset.mermaidTheme ?? null,
      modalZoom: Number(diagram?.dataset.mermaidZoom ?? '0'),
      isPannable: diagram?.dataset.mermaidPannable ?? null,
      scrollLeft: Math.round(scrollShell?.scrollLeft ?? 0),
      scrollTop: Math.round(scrollShell?.scrollTop ?? 0),
      svgWidth: Math.round(svg?.getBoundingClientRect().width ?? 0),
      textFill: textNode ? window.getComputedStyle(textNode).fill : null,
      actorBoxFill: actorBox ? window.getComputedStyle(actorBox).fill : null,
      lineStroke: line ? window.getComputedStyle(line).stroke : null,
      copyImageDisabled: copyImageButton instanceof HTMLButtonElement ? copyImageButton.disabled : null,
    };
  });
}

async function readMermaidForeignObjectClippingSnapshot(page, selector) {
  return page.evaluate((requestedSelector) => {
    const container = document.querySelector(requestedSelector);
    const svg = container?.querySelector('svg');

    if (!svg) {
      return { hasSvg: false, clipped: [] };
    }

    const clipped = Array.from(svg.querySelectorAll('foreignObject'))
      .flatMap((foreignObject, index) => {
        const text = (foreignObject.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
        const allocatedWidth = Number(foreignObject.getAttribute('width')) || foreignObject.clientWidth;
        const allocatedHeight = Number(foreignObject.getAttribute('height')) || foreignObject.clientHeight;
        const foreignObjectRect = foreignObject.getBoundingClientRect();
        const issues = [];

        const range = document.createRange();
        range.selectNodeContents(foreignObject);
        const rangeRect = range.getBoundingClientRect();
        if (
          rangeRect.width > 0 &&
          rangeRect.height > 0 &&
          (
            rangeRect.left < foreignObjectRect.left - 2 ||
            rangeRect.right > foreignObjectRect.right + 2 ||
            rangeRect.top < foreignObjectRect.top - 2 ||
            rangeRect.bottom > foreignObjectRect.bottom + 2
          )
        ) {
          issues.push({
            index,
            kind: 'range-outside-foreignObject',
            text,
            allocatedWidth,
            allocatedHeight,
            rangeWidth: Math.round(rangeRect.width),
            rangeHeight: Math.round(rangeRect.height),
          });
        }

        const candidates = new Set([
          foreignObject.querySelector('p'),
          foreignObject.querySelector('div'),
          ...foreignObject.querySelectorAll('p, div, span'),
        ].filter((node) => node instanceof HTMLElement));

        candidates.forEach((content) => {
          const rect = content.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            return;
          }

          const overflowX = content.scrollWidth - content.clientWidth;
          const overflowY = content.scrollHeight - content.clientHeight;
          if (overflowX <= 1 && overflowY <= 1) {
            return;
          }

          const style = window.getComputedStyle(content);
          issues.push({
            index,
            kind: 'element-scroll-clipping',
            tag: content.tagName.toLowerCase(),
            text,
            allocatedWidth,
            allocatedHeight,
            contentClientWidth: content.clientWidth,
            contentClientHeight: content.clientHeight,
            contentScrollWidth: content.scrollWidth,
            contentScrollHeight: content.scrollHeight,
            overflowX,
            overflowY,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            margin: style.margin,
          });
        });

        return issues;
      });

    return { hasSvg: true, clipped };
  }, selector);
}

async function assertMermaidForeignObjectLabelsNotClipped(page) {
  console.log('[chapter routes smoke] checking Mermaid foreignObject label clipping');

  const url = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${DR6_CERTIFICATION_CHAPTER_ID}#${DR6_CERTIFICATION_TIER_HEADING_ID}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction((groupSelector) => {
    const group = document.querySelector(groupSelector);
    const activePanel = group?.querySelector('.tabbed-example-panel:not([hidden])');
    return group?.querySelector('[role="tab"][aria-selected="true"]') &&
      activePanel?.querySelector('.mermaid svg');
  }, DR6_CERTIFICATION_TIER_GROUP_SELECTOR, { timeout: 20_000 });

  const tabKeys = ['tier-1', 'tier-2', 'tier-3', 'tier-4'];
  for (const key of tabKeys) {
    await page.locator(`${DR6_CERTIFICATION_TIER_GROUP_SELECTOR} [role="tab"][data-tabbed-example-key="${key}"]`).click();
    await page.waitForFunction(({ groupSelector, expectedKey }) => {
      const group = document.querySelector(groupSelector);
      const activePanel = group?.querySelector(`.tabbed-example-panel[data-tabbed-example-key="${expectedKey}"]`);
      return group?.querySelector(`[role="tab"][aria-selected="true"][data-tabbed-example-key="${expectedKey}"]`) &&
        activePanel &&
        !activePanel.hidden &&
        activePanel.querySelector('.mermaid svg');
    }, { groupSelector: DR6_CERTIFICATION_TIER_GROUP_SELECTOR, expectedKey: key }, { timeout: 20_000 });

    const inlineSelector = `${DR6_CERTIFICATION_TIER_GROUP_SELECTOR} .tabbed-example-panel[data-tabbed-example-key="${key}"] .mermaid`;
    const inlineSnapshot = await readMermaidForeignObjectClippingSnapshot(page, inlineSelector);
    if (!inlineSnapshot.hasSvg || inlineSnapshot.clipped.length > 0) {
      throw new Error(`inline certification tier labels clipped for ${key}: ${JSON.stringify(inlineSnapshot)}`);
    }

    await page.locator(`${inlineSelector} button[data-mermaid-action="expand"]`).click();
    await page.waitForSelector('.mermaid-modal-diagram svg', { timeout: 20_000 });

    const modalSnapshot = await readMermaidForeignObjectClippingSnapshot(page, '.mermaid-modal-diagram');
    if (!modalSnapshot.hasSvg || modalSnapshot.clipped.length > 0) {
      throw new Error(`expanded certification tier labels clipped for ${key}: ${JSON.stringify(modalSnapshot)}`);
    }

    await page.locator('.mermaid-modal-button.is-close').click();
    await page.waitForFunction(() => !document.querySelector('.mermaid-modal'), null, { timeout: 20_000 });
  }
}

async function assertMermaidClusterLabelsDoNotOverlapNodes(page) {
  console.log('[chapter routes smoke] checking Mermaid cluster label/node overlap');

  const failures = [];

  for (const chapterId of getDr6ContentChapterIds()) {
    const url = `${getBaseUrl(page.__readerPort)}/${DR6_SLUG}/${chapterId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.chapter-article', { timeout: 20_000 });
    await page.waitForTimeout(900);

    const chapterFailures = await page.evaluate((thresholds) => {
      const headingBefore = (container) => {
        let previous = container.previousElementSibling;
        while (previous) {
          if (/^H[1-6]$/.test(previous.tagName)) {
            return {
              id: previous.id,
              text: (previous.textContent ?? '').replace(/\s+/g, ' ').trim(),
            };
          }
          previous = previous.previousElementSibling;
        }
        return null;
      };

      const intersection = (first, second) => {
        const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
        const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
        return { width, height, area: width * height };
      };

      const relativeRect = (rect, svgRect) => ({
        x: Math.round((rect.left - svgRect.left) * 10) / 10,
        y: Math.round((rect.top - svgRect.top) * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      });

      return Array.from(document.querySelectorAll('.chapter-article .mermaid')).flatMap((container, diagramIndex) => {
        const svg = container.querySelector('svg');
        if (!svg) {
          return [];
        }

        const svgRect = svg.getBoundingClientRect();
        const labels = Array.from(svg.querySelectorAll('g.cluster-label'))
          .map((label, labelIndex) => ({
            labelIndex,
            text: (label.textContent ?? '').replace(/\s+/g, ' ').trim(),
            rect: label.getBoundingClientRect(),
          }))
          .filter((label) => label.text);
        const nodes = Array.from(svg.querySelectorAll('g.node')).map((node, nodeIndex) => ({
          nodeIndex,
          text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
          rect: node.getBoundingClientRect(),
        }));

        const hits = [];
        for (const label of labels) {
          for (const node of nodes) {
            const overlap = intersection(label.rect, node.rect);
            if (
              overlap.width > 2 &&
              overlap.height > 2 &&
              (
                overlap.height >= thresholds.maxAllowedOverlapY ||
                overlap.area >= thresholds.maxAllowedOverlapArea
              )
            ) {
              hits.push({
                label: {
                  index: label.labelIndex,
                  text: label.text.slice(0, 160),
                  rect: relativeRect(label.rect, svgRect),
                },
                node: {
                  index: node.nodeIndex,
                  text: node.text.slice(0, 160),
                  rect: relativeRect(node.rect, svgRect),
                },
                overlap: {
                  width: Math.round(overlap.width * 10) / 10,
                  height: Math.round(overlap.height * 10) / 10,
                  area: Math.round(overlap.area),
                },
              });
            }
          }
        }

        if (hits.length === 0) {
          return [];
        }

        return [{
          diagramIndex,
          heading: headingBefore(container),
          svg: {
            width: Math.round(svgRect.width),
            height: Math.round(svgRect.height),
            viewBox: svg.getAttribute('viewBox'),
          },
          hits,
        }];
      });
    }, {
      maxAllowedOverlapY: MERMAID_CLUSTER_LABEL_NODE_OVERLAP_Y_THRESHOLD,
      maxAllowedOverlapArea: MERMAID_CLUSTER_LABEL_NODE_OVERLAP_AREA_THRESHOLD,
    });

    for (const failure of chapterFailures) {
      failures.push({ chapterId, ...failure });
    }
  }

  if (failures.length > 0) {
    throw new Error(`Mermaid cluster labels overlap nodes: ${JSON.stringify(failures.slice(0, 12), null, 2)}`);
  }
}

async function dragMermaidScrollShell(page, selector, { deltaX = 0, deltaY = 0 } = {}) {
  const result = await page.evaluate(({ requestedSelector, requestedDeltaX, requestedDeltaY }) => {
    const shell = document.querySelector(requestedSelector);
    if (!(shell instanceof HTMLElement)) {
      return { ok: false, reason: `missing selector: ${requestedSelector}` };
    }

    const rect = shell.getBoundingClientRect();
    const startX = rect.left + Math.min(Math.max(rect.width * 0.5, 24), rect.width - 24);
    const startY = rect.top + Math.min(Math.max(rect.height * 0.5, 24), rect.height - 24);
    const endX = startX + requestedDeltaX;
    const endY = startY + requestedDeltaY;

    const dispatch = (target, type, x, y, buttons) => {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        view: window,
      }));
    };

    dispatch(shell, 'mousedown', startX, startY, 1);
    dispatch(window, 'mousemove', endX, endY, 1);
    dispatch(window, 'mouseup', endX, endY, 0);

    return {
      ok: true,
      scrollLeft: Math.round(shell.scrollLeft),
      scrollTop: Math.round(shell.scrollTop),
    };
  }, {
    requestedSelector: selector,
    requestedDeltaX: deltaX,
    requestedDeltaY: deltaY,
  });

  if (!result?.ok) {
    throw new Error(`failed to drag Mermaid scroll shell: ${result?.reason ?? 'unknown error'}`);
  }

  return result;
}

async function assertMermaidThemeToggle(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_PILOT_CHAPTER_ID}#${DR2_PILOT_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking Mermaid theme toggle rerender: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(({ slug, chapterId, headingId }) => {
    const target = document.getElementById(headingId);
    const top = target?.getBoundingClientRect().top ?? null;
    let container = target?.nextElementSibling ?? null;
    while (container && !(container instanceof HTMLElement && container.matches('.mermaid'))) {
      if (/^H[1-6]$/.test(container.tagName)) {
        container = null;
        break;
      }
      container = container.nextElementSibling;
    }
    const svg = container?.querySelector('svg');
    const textNode = svg?.querySelector('.noteText, text, tspan');
    const actorBox = svg?.querySelector('rect.actor');
    const line = svg?.querySelector('.actor-line, .messageLine0, .messageLine1, .flowchart-link');

    return (
      window.location.pathname === `/${slug}/${chapterId}` &&
      window.location.hash === `#${headingId}` &&
      top != null &&
      top >= 0 &&
      top <= 180 &&
      Boolean(svg) &&
      Boolean(textNode) &&
      Boolean(actorBox) &&
      Boolean(line)
    );
  }, {
    slug: DR2_SLUG,
    chapterId: DR2_PILOT_CHAPTER_ID,
    headingId: DR2_PILOT_HEADING_ID,
  }, { timeout: 20_000 });

  await page.waitForTimeout(250);
  const darkSnapshot = await readMermaidPresentationSnapshot(page);
  if (!darkSnapshot.hasSvg || darkSnapshot.hasFallbackSource) {
    throw new Error(`pilot Mermaid dark snapshot invalid: ${JSON.stringify(darkSnapshot)}`);
  }

  if (darkSnapshot.isOverflowing !== 'true' || darkSnapshot.overflowRight !== 'true') {
    throw new Error(`pilot Mermaid dark overflow affordance missing: ${JSON.stringify(darkSnapshot)}`);
  }

  await page.locator('button.theme-toggle').click();

  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, { timeout: 20_000 });
  await page.waitForFunction(() => {
    const heading = document.getElementById('431-registration-sequence-diagram-direct-rp-model');
    let container = heading?.nextElementSibling ?? null;
    while (container && !(container instanceof HTMLElement && container.matches('.mermaid'))) {
      if (/^H[1-6]$/.test(container.tagName)) {
        container = null;
        break;
      }
      container = container.nextElementSibling;
    }
    const svg = container?.querySelector('svg');
    const textNode = svg?.querySelector('.noteText, text, tspan');
    const actorBox = svg?.querySelector('rect.actor');
    const line = svg?.querySelector('.actor-line, .messageLine0, .messageLine1, .flowchart-link');

    return Boolean(svg) &&
      container?.dataset.mermaidTheme === 'light' &&
      Boolean(textNode) &&
      Boolean(actorBox) &&
      Boolean(line) &&
      !(container?.textContent ?? '').includes('sequenceDiagram');
  }, null, { timeout: 20_000 });

  await page.waitForTimeout(250);
  const lightSnapshot = await readMermaidPresentationSnapshot(page);
  if (!lightSnapshot.hasSvg || lightSnapshot.hasFallbackSource) {
    throw new Error(`pilot Mermaid light snapshot invalid: ${JSON.stringify(lightSnapshot)}`);
  }

  if (lightSnapshot.isOverflowing !== 'true' || lightSnapshot.overflowRight !== 'true') {
    throw new Error(`pilot Mermaid light overflow affordance missing: ${JSON.stringify(lightSnapshot)}`);
  }

  if (darkSnapshot.textFill === lightSnapshot.textFill) {
    throw new Error(`diagram text color did not change across theme toggle: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (darkSnapshot.actorBoxFill === lightSnapshot.actorBoxFill) {
    throw new Error(`actor box color did not change across theme toggle: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (darkSnapshot.lineStroke === lightSnapshot.lineStroke) {
    throw new Error(`line color did not change across theme toggle: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (!darkSnapshot.sequenceNumberFill || !lightSnapshot.sequenceNumberFill) {
    throw new Error(`sequence number color missing from pilot snapshots: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (!darkSnapshot.sequenceBadgeFill || !lightSnapshot.sequenceBadgeFill) {
    throw new Error(`sequence badge color missing from pilot snapshots: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (darkSnapshot.sequenceNumberFill === lightSnapshot.sequenceNumberFill) {
    throw new Error(`sequence number color did not change across theme toggle: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (darkSnapshot.sequenceBadgeFill === lightSnapshot.sequenceBadgeFill) {
    throw new Error(`sequence badge color did not change across theme toggle: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (Number(darkSnapshot.scrollHintOpacity ?? '0') < 0.95) {
    throw new Error(`scroll hint not visible for overflowing pilot Mermaid diagram in dark theme: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }

  if (!lightSnapshot.hasExpandButton) {
    throw new Error(`expanded-view affordance missing for overflowing pilot Mermaid diagram in light theme: ${JSON.stringify({ darkSnapshot, lightSnapshot })}`);
  }
}

async function assertMermaidExpandControlVisibleOnAllDiagrams(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_MERMAID_CHAPTER_ID}#${DR2_MERMAID_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking Mermaid expand control on non-pilot diagram: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => document.querySelectorAll('.mermaid .mermaid-expand-button').length >= 1, null, { timeout: 20_000 });
}

async function assertExpandedMermaidViewer(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_PILOT_CHAPTER_ID}#${DR2_PILOT_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking expanded Mermaid viewer: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ensureTheme(page, 'dark');
  await page.evaluate(() => {
    window.localStorage.setItem('dr-reader-mermaid-global-zoom', '100');
    window.localStorage.setItem('dr-reader-mermaid-remember-zoom', 'false');
    window.localStorage.setItem('dr-reader-mermaid-remember-zoom-explicit', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ensureTheme(page, 'dark');

  await page.waitForFunction((headingId) => {
    const heading = document.getElementById(headingId);
    let container = heading?.nextElementSibling ?? null;
    while (container && !(container instanceof HTMLElement && container.matches('.mermaid'))) {
      if (/^H[1-6]$/.test(container.tagName)) {
        container = null;
        break;
      }
      container = container.nextElementSibling;
    }

    return Boolean(container?.querySelector('svg')) && Boolean(container?.querySelector('.mermaid-expand-button'));
  }, DR2_PILOT_HEADING_ID, { timeout: 20_000 });

  await tagMermaidContainerForHeading(page, DR2_PILOT_HEADING_ID, 'pilot');

  const initialInlineSnapshot = await readTaggedMermaidSnapshot(page, 'pilot');
  if (initialInlineSnapshot.isPannable !== 'true') {
    throw new Error(`pilot Mermaid diagram is not marked pannable before drag test: ${JSON.stringify(initialInlineSnapshot)}`);
  }

  const inlineDragResult = await dragMermaidScrollShell(page, '[data-test-mermaid-target="pilot"] .mermaid-scroll-shell', { deltaX: -160 });
  if ((inlineDragResult.scrollLeft ?? 0) <= 40) {
    throw new Error(`inline Mermaid drag pan did not move scroll position: ${JSON.stringify(inlineDragResult)}`);
  }

  await page.locator('[data-test-mermaid-target="pilot"] button[data-mermaid-action="zoom-in"]').click();
  await page.waitForFunction(() => (
    Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 110 &&
    Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 110
  ), null, { timeout: 20_000 });

  const expandButton = page.locator('[data-test-mermaid-target="pilot"] .mermaid-expand-button');
  const modal = page.locator('.mermaid-modal');
  await expandButton.focus();
  await expandButton.click();

  await page.waitForFunction(() => {
    const modal = document.querySelector('.mermaid-modal');
    const diagram = modal?.querySelector('.mermaid-modal-diagram');
    const svg = diagram?.querySelector('svg');
    return Boolean(modal) &&
      Boolean(svg) &&
      diagram?.dataset.mermaidTheme === 'dark' &&
      typeof diagram?.dataset.mermaidPannable === 'string' &&
      !(diagram?.textContent ?? '').includes('sequenceDiagram');
  }, null, { timeout: 20_000 });

  const darkModalSnapshot = await readExpandedMermaidSnapshot(page);
  if (!darkModalSnapshot.isOpen || !darkModalSnapshot.hasSvg || darkModalSnapshot.hasFallbackSource) {
    throw new Error(`expanded Mermaid modal dark snapshot invalid: ${JSON.stringify(darkModalSnapshot)}`);
  }

  if (!darkModalSnapshot.title?.includes('Registration Sequence Diagram')) {
    throw new Error(`expanded Mermaid modal title missing pilot heading text: ${JSON.stringify(darkModalSnapshot)}`);
  }

  if (darkModalSnapshot.modalZoom !== 110) {
    throw new Error(`expanded Mermaid modal did not inherit inline zoom: ${JSON.stringify(darkModalSnapshot)}`);
  }

  if (darkModalSnapshot.isPannable !== 'true') {
    throw new Error(`expanded Mermaid modal diagram is not marked pannable: ${JSON.stringify(darkModalSnapshot)}`);
  }

  const baselineWidth = darkModalSnapshot.svgWidth;
  if (baselineWidth <= 0) {
    throw new Error(`expanded Mermaid baseline width invalid: ${JSON.stringify(darkModalSnapshot)}`);
  }

  const modalDragResult = await dragMermaidScrollShell(page, '.mermaid-modal-diagram .mermaid-scroll-shell', { deltaX: -160 });
  if ((modalDragResult.scrollLeft ?? 0) <= 40) {
    throw new Error(`expanded Mermaid drag pan did not move scroll position: ${JSON.stringify(modalDragResult)}`);
  }

  await modal.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.waitForFunction((initialWidth) => {
    const diagram = document.querySelector('.mermaid-modal-diagram');
    const svg = diagram?.querySelector('svg');
    return Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 120 &&
      Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 120 &&
      Number(diagram?.dataset.mermaidZoom ?? '0') === 120 &&
      Math.round(svg?.getBoundingClientRect().width ?? 0) > initialWidth;
  }, baselineWidth, { timeout: 20_000 });

  await modal.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForFunction((initialWidth) => {
    const diagram = document.querySelector('.mermaid-modal-diagram');
    const svg = diagram?.querySelector('svg');
    return Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 60 &&
      Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 60 &&
      Number(diagram?.dataset.mermaidZoom ?? '0') === 60 &&
      Math.round(svg?.getBoundingClientRect().width ?? 0) < initialWidth;
  }, baselineWidth, { timeout: 20_000 });

  await modal.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction((initialWidth) => {
    const diagram = document.querySelector('.mermaid-modal-diagram');
    const svg = diagram?.querySelector('svg');
    return Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 50 &&
      Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 50 &&
      Number(diagram?.dataset.mermaidZoom ?? '0') === 50 &&
      Math.round(svg?.getBoundingClientRect().width ?? 0) < initialWidth;
  }, baselineWidth, { timeout: 20_000 });

  await modal.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForFunction(() => (
    Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 60 &&
    Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 60 &&
    Number(document.querySelector('.mermaid-modal-diagram')?.dataset.mermaidZoom ?? '0') === 60
  ), null, { timeout: 20_000 });

  const inlineSnapshotWhileModalOpen = await readTaggedMermaidSnapshot(page, 'pilot');
  if (inlineSnapshotWhileModalOpen.zoom !== EXPANDED_MERMAID_RESET_ZOOM) {
    throw new Error(`modal zoom did not stay synchronized with inline pilot diagram: ${JSON.stringify(inlineSnapshotWhileModalOpen)}`);
  }

  await modal.getByRole('button', { name: 'Copy source', exact: true }).click();
  await page.waitForTimeout(200);
  const copiedSource = await page.evaluate(() => navigator.clipboard.readText());
  if (!copiedSource.includes('sequenceDiagram') || !copiedSource.includes('participant RP')) {
    throw new Error(`expanded Mermaid source copy returned unexpected clipboard text: ${copiedSource.slice(0, 160)}`);
  }

  const canCopyImage = !(await modal.getByRole('button', { name: 'Copy image', exact: true }).isDisabled());
  if (canCopyImage) {
    await modal.getByRole('button', { name: 'Copy image', exact: true }).click();
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('.mermaid-modal-button'))
        .find((node) => (node.textContent ?? '').includes('Copied image'));
      return Boolean(button);
    }, null, { timeout: 20_000 });
  }

  await page.evaluate(() => {
    document.querySelector('button.theme-toggle')?.click();
  });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, { timeout: 20_000 });
  await page.waitForFunction(() => {
    const diagram = document.querySelector('.mermaid-modal-diagram');
    const svg = diagram?.querySelector('svg');
    return Boolean(svg) &&
      diagram?.dataset.mermaidTheme === 'light' &&
      !(diagram?.textContent ?? '').includes('sequenceDiagram');
  }, null, { timeout: 20_000 });

  const lightModalSnapshot = await readExpandedMermaidSnapshot(page);
  if (!lightModalSnapshot.isOpen || !lightModalSnapshot.hasSvg || lightModalSnapshot.hasFallbackSource) {
    throw new Error(`expanded Mermaid modal light snapshot invalid: ${JSON.stringify(lightModalSnapshot)}`);
  }

  if (lightModalSnapshot.modalZoom !== EXPANDED_MERMAID_RESET_ZOOM) {
    throw new Error(`expanded Mermaid modal zoom drifted across theme toggle: ${JSON.stringify({ darkModalSnapshot, lightModalSnapshot })}`);
  }

  if (darkModalSnapshot.textFill === lightModalSnapshot.textFill) {
    throw new Error(`expanded Mermaid text color did not change across theme toggle: ${JSON.stringify({ darkModalSnapshot, lightModalSnapshot })}`);
  }

  if (darkModalSnapshot.actorBoxFill === lightModalSnapshot.actorBoxFill) {
    throw new Error(`expanded Mermaid actor color did not change across theme toggle: ${JSON.stringify({ darkModalSnapshot, lightModalSnapshot })}`);
  }

  if (darkModalSnapshot.lineStroke === lightModalSnapshot.lineStroke) {
    throw new Error(`expanded Mermaid line color did not change across theme toggle: ${JSON.stringify({ darkModalSnapshot, lightModalSnapshot })}`);
  }

  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();
  if (!suggestedFilename.endsWith('-light.png')) {
    throw new Error(`expanded Mermaid PNG download filename did not include active theme: ${suggestedFilename}`);
  }

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.mermaid-modal'), null, { timeout: 20_000 });
  await page.waitForFunction(() => document.activeElement?.dataset?.mermaidAction === 'expand', null, { timeout: 5_000 });
}

async function assertMermaidZoomControlsAndPersistence(page) {
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_MULTI_MERMAID_CHAPTER_ID}#${DR2_MULTI_MERMAID_HEADING_ID}`;
  console.log(`[chapter routes smoke] checking Mermaid zoom controls and persistence: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.setItem('dr-reader-mermaid-global-zoom', '100');
    window.localStorage.setItem('dr-reader-mermaid-remember-zoom', 'false');
    window.localStorage.setItem('dr-reader-mermaid-remember-zoom-explicit', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ensureTheme(page, 'dark');

  await page.waitForFunction(() => {
    const containers = document.querySelectorAll('.chapter-article .mermaid');
    return containers.length >= 2 &&
      Array.from(containers).every((container) => Boolean(container.querySelector('svg')));
  }, null, { timeout: 20_000 });

  await tagMermaidContainerForHeading(page, DR2_MULTI_MERMAID_HEADING_ID, 'primary');
  await tagMermaidContainerByIndex(page, 2, 'secondary');

  const initialPrimary = await readTaggedMermaidSnapshot(page, 'primary');
  const initialSecondary = await readTaggedMermaidSnapshot(page, 'secondary');

  if (!initialPrimary.hasZoomOutButton || !initialPrimary.hasZoomInButton || !initialPrimary.hasExpandButton) {
    throw new Error(`primary Mermaid controls missing: ${JSON.stringify(initialPrimary)}`);
  }

  if (initialPrimary.zoom !== 100 || initialPrimary.zoomDisplay !== '100%' || initialSecondary.zoom !== 100) {
    throw new Error(`initial Mermaid zoom state unexpected: ${JSON.stringify({ initialPrimary, initialSecondary })}`);
  }

  await openDisplaySettings(page);
  if (await page.locator('.display-settings-popover').getByText('Remember diagram zoom globally').count()) {
    throw new Error('display settings still expose the removed Mermaid zoom persistence toggle');
  }
  await closeDisplaySettings(page);

  await page.locator('[data-test-mermaid-target="primary"] button[data-mermaid-action="zoom-in"]').click();
  await page.waitForFunction(() => {
    const primary = document.querySelector('[data-test-mermaid-target="primary"]');
    const secondary = document.querySelector('[data-test-mermaid-target="secondary"]');
    return Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 110 &&
      Number(primary?.dataset.mermaidZoom ?? '0') === 110 &&
      Number(secondary?.dataset.mermaidZoom ?? '0') === 110;
  }, null, { timeout: 20_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await ensureTheme(page, 'dark');
  await page.waitForFunction(() => {
    const containers = document.querySelectorAll('.chapter-article .mermaid');
    return containers.length >= 2 &&
      Array.from(containers).every((container) => Boolean(container.querySelector('svg')));
  }, null, { timeout: 20_000 });

  await tagMermaidContainerForHeading(page, DR2_MULTI_MERMAID_HEADING_ID, 'primary');
  await tagMermaidContainerByIndex(page, 2, 'secondary');

  await page.waitForFunction(() => (
    Number(document.querySelector('[data-test-mermaid-target="primary"]')?.dataset.mermaidZoom ?? '0') === 110 &&
    Number(document.querySelector('[data-test-mermaid-target="secondary"]')?.dataset.mermaidZoom ?? '0') === 110
  ), null, { timeout: 20_000 });

  await page.locator('button.theme-toggle').click();
  await page.waitForFunction(() => (
    document.documentElement.dataset.theme === 'light' &&
    Number(document.querySelector('[data-test-mermaid-target="primary"]')?.dataset.mermaidZoom ?? '0') === 110 &&
    Number(document.querySelector('[data-test-mermaid-target="secondary"]')?.dataset.mermaidZoom ?? '0') === 110 &&
    Boolean(document.querySelector('[data-test-mermaid-target="primary"] svg')) &&
    Boolean(document.querySelector('[data-test-mermaid-target="secondary"] svg'))
  ), null, { timeout: 20_000 });

  const persistedPrimary = await readTaggedMermaidSnapshot(page, 'primary');
  const persistedSecondary = await readTaggedMermaidSnapshot(page, 'secondary');
  if (persistedPrimary.zoomDisplay !== '110%' || persistedSecondary.zoomDisplay !== '110%') {
    throw new Error(`persisted inline Mermaid zoom display drifted after reload/theme toggle: ${JSON.stringify({ persistedPrimary, persistedSecondary })}`);
  }

  const nextUrl = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/${DR2_MERMAID_CHAPTER_ID}#${DR2_MERMAID_HEADING_ID}`;
  await page.goto(nextUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const container = document.querySelector('.chapter-article .mermaid');
    return Boolean(container?.querySelector('svg')) && Number(container?.dataset.mermaidZoom ?? '0') === 110;
  }, null, { timeout: 20_000 });

  await page.evaluate(() => {
    window.localStorage.setItem('dr-reader-mermaid-global-zoom', '999');
    window.localStorage.setItem('dr-reader-mermaid-remember-zoom', 'false');
    window.localStorage.setItem('dr-reader-mermaid-remember-zoom-explicit', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const container = document.querySelector('.chapter-article .mermaid');
    return Boolean(container?.querySelector('svg')) &&
      Number(container?.dataset.mermaidZoom ?? '0') === 60 &&
      window.localStorage.getItem('dr-reader-mermaid-global-zoom') === '60';
  }, null, { timeout: 20_000 });
}

async function main() {
  await runCommand('node', ['scripts/build-reader-assets.js']);

  const server = startServer();
  let browser;
  let context;

  try {
    const serverHandle = await server;
    await waitForFreshServer(serverHandle);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1960, height: 1280 },
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: getBaseUrl(serverHandle.port) });
    const page = await context.newPage();
    page.__readerPort = serverHandle.port;

    await assertSlugRedirect(page);
    await assertInitialChapterRoute(page);
    await assertGroupHeadingRoute(page);
    await assertChapterNavTransition(page);
    await assertChapterNavScrollPersistence(page);
    await assertArticleRefreshScrollRestoration(page);
    await assertLayoutWidthControls(page);
    await assertChapterNavControls(page);
    await assertLayoutWidthRespectsExplicitNavResize(page);
    await assertOutlineHashNavigation(page);
    await assertBottomPager(page);
    await assertGeneratedCrossReferenceNavigation(page);
    await assertGeneratedLabelCrossReferenceNavigation(page);
    await assertExternalLinksOpenInNewTab(page);
    await assertArfLinksResolveAsExternalLinks(page);
    await assertArfTopicLinksResolveAsExternalLinks(page);
    await assertInitialHashRouteSurvivesMermaidRender(page);
    await assertViewerSuppressesStandaloneBreakSpacers(page);
    await assertTabbedMermaidPilot(page);
    await assertEmbeddedTierRankingTabs(page);
    await assertTabbedExamplePilot(page);
    await assertCodeSyntaxHighlighting(page);
    await assertNimSyntaxHighlighting(page);
    await assertMermaidThemeToggle(page);
    await assertMermaidExpandControlVisibleOnAllDiagrams(page);
    await assertExpandedMermaidViewer(page);
    await assertMermaidZoomControlsAndPersistence(page);
    await assertMermaidForeignObjectLabelsNotClipped(page);
    await assertMermaidClusterLabelsDoNotOverlapNodes(page);

    console.log('[chapter routes smoke] all chapter-route checks passed');
  } finally {
    if (context) {
      await context.close();
    }
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
