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
const DR2_SLUG = 'DR-0002-eudi-wallet-relying-party-integration';
const DR2_SOURCE_CHAPTER_ID = '10-cross-device-remote-presentation';
const DR2_TARGET_CHAPTER_ID = '9-same-device-remote-presentation';
const DR2_TARGET_HEADING_ID = '91-flow-description';
const DR2_MERMAID_CHAPTER_ID = '24-bank-and-psp-integration-blueprint-eudi-wallet-compliance-hub';
const DR2_MERMAID_HEADING_ID = '245-psp-specific-threat-profile';
const DR2_PILOT_CHAPTER_ID = '4-rp-registration-data-model-and-registrar-api';
const DR2_PILOT_HEADING_ID = '431-registration-sequence-diagram-direct-rp-model';
const DR2_MULTI_MERMAID_CHAPTER_ID = '13-proximity-presentation-flows-iso-18013-5-supervised-and-unsupervised';
const DR2_MULTI_MERMAID_HEADING_ID = '134-supervised-flow-sequence-diagram-direct-rp-model';
const DR2_ARF_CHAPTER_ID = '7-identifier-and-trust-model-x509-dids-and-the-wallet-landscape';
const DR2_ARF_HEADING_ID = '72-the-arf-mandate-x509-for-the-core-dids-optional-for-non-qualified-eaas';
const DR2_RULEBOOK_CHAPTER_ID = '6-credential-formats-sd-jwt-vc-mdoc-and-format-selection';
const DR1_LABEL_SOURCE_CHAPTER_ID = 'appendix-f-ibm-contextforge-batteries-included-mcp-gateway-with-safety-guardrails';
const DR1_LABEL_TARGET_CHAPTER_ID = '26-findings';
const DR1_LABEL_TARGET_HEADING_ID = 'finding-26';

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

  const carryForwardLink = page.locator('a[href="https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#71-introduction"]').first();
  await carryForwardLink.waitFor({ state: 'visible', timeout: 20_000 });

  const carryForwardText = await carryForwardLink.textContent();
  const carryForwardXref = await carryForwardLink.getAttribute('data-doc-xref');
  if (carryForwardText?.trim() !== '§7.1') {
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
  const url = `${getBaseUrl(page.__readerPort)}/${DR2_SLUG}/29-security-threat-catalogue#2921-rp-driven-credential-phishing-and-os-spying`;
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
    return Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 100 &&
      Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 100 &&
      Number(diagram?.dataset.mermaidZoom ?? '0') === 100 &&
      Math.round(svg?.getBoundingClientRect().width ?? 0) < initialWidth;
  }, baselineWidth, { timeout: 20_000 });

  await modal.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction((initialWidth) => {
    const diagram = document.querySelector('.mermaid-modal-diagram');
    const svg = diagram?.querySelector('svg');
    return Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 90 &&
      Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 90 &&
      Number(diagram?.dataset.mermaidZoom ?? '0') === 90 &&
      Math.round(svg?.getBoundingClientRect().width ?? 0) < initialWidth;
  }, baselineWidth, { timeout: 20_000 });

  await modal.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForFunction(() => (
    Number(window.localStorage.getItem('dr-reader-mermaid-global-zoom') ?? '0') === 100 &&
    Number(document.querySelector('[data-test-mermaid-target="pilot"]')?.dataset.mermaidZoom ?? '0') === 100 &&
    Number(document.querySelector('.mermaid-modal-diagram')?.dataset.mermaidZoom ?? '0') === 100
  ), null, { timeout: 20_000 });

  const inlineSnapshotWhileModalOpen = await readTaggedMermaidSnapshot(page, 'pilot');
  if (inlineSnapshotWhileModalOpen.zoom !== 100) {
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

  if (lightModalSnapshot.modalZoom !== 100) {
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
  await tagMermaidContainerByIndex(page, 1, 'secondary');

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
  await tagMermaidContainerByIndex(page, 1, 'secondary');

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
      Number(container?.dataset.mermaidZoom ?? '0') === 100 &&
      window.localStorage.getItem('dr-reader-mermaid-global-zoom') === '100';
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
    await assertMermaidThemeToggle(page);
    await assertMermaidExpandControlVisibleOnAllDiagrams(page);
    await assertExpandedMermaidViewer(page);
    await assertMermaidZoomControlsAndPersistence(page);

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
