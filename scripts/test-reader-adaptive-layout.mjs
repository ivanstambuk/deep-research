import process from 'node:process';
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
const CHAPTER_ID = '14-authorization-approval-and-consent-models';
const HEADING_ID = '140-consent-lifecycle-overview';
const HEADING_TEXT = '14.0 Consent Lifecycle Overview';
const ROUTE = `/${DOC_SLUG}/${CHAPTER_ID}`;

async function resetAdaptiveState(page, {
  navCollapsed = false,
  mermaidZoom = 60,
} = {}) {
  await page.goto(`${getBaseUrl(page.__readerPort)}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ collapsed, zoom }) => {
    window.localStorage.setItem('dr-reader-layout-width', 'recommended');
    window.localStorage.setItem('dr-reader-nav-collapsed', collapsed ? 'true' : 'false');
    window.localStorage.setItem('dr-reader-nav-width-explicit', 'false');
    window.localStorage.setItem('dr-reader-outline-width-explicit', 'false');
    window.localStorage.setItem('dr-reader-mermaid-global-zoom', String(zoom));
  }, {
    collapsed: navCollapsed,
    zoom: mermaidZoom,
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(({ slug, chapterId, collapsed }) => (
    window.location.pathname === `/${slug}/${chapterId}` &&
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'adaptive' &&
    document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed') === collapsed &&
    Boolean(document.querySelector('.chapter-article'))
  ), {
    slug: DOC_SLUG,
    chapterId: CHAPTER_ID,
    collapsed: navCollapsed,
  }, { timeout: 20_000 });
}

async function readGeometry(page) {
  return page.evaluate(() => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!(node instanceof Element)) {
        return null;
      }
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        right: rect.right,
        width: rect.width,
      };
    };
    const article = document.querySelector('.chapter-article');
    const prose = article
      ? [...article.children].find((node) => ['P', 'UL', 'OL'].includes(node.tagName))
      : null;
    const technical = article?.querySelector('details, .table-scroll, .mermaid, .tabbed-example-group');
    const proseRect = prose?.getBoundingClientRect();
    const technicalRect = technical?.getBoundingClientRect();

    return {
      mode: document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') ?? null,
      shell: box('.chapter-reader'),
      nav: box('.chapter-nav-sidebar'),
      main: box('.chapter-main-column'),
      article: box('.chapter-article'),
      outline: box('.chapter-outline-sidebar'),
      proseWidth: proseRect?.width ?? 0,
      proseMaxInlineSize: prose ? getComputedStyle(prose).maxInlineSize : null,
      technicalWidth: technicalRect?.width ?? 0,
      pageOverflow: Math.max(
        document.documentElement.scrollWidth - window.innerWidth,
        document.body.scrollWidth - window.innerWidth,
      ),
    };
  });
}

function assertNoPageOverflow(label, geometry) {
  if (geometry.pageOverflow > 1) {
    throw new Error(`${label} introduced page overflow: ${JSON.stringify(geometry)}`);
  }
}

async function assertAdaptiveReclaimsNavWidth(page) {
  console.log('[adaptive layout] checking collapsed-nav width reclamation');
  await page.setViewportSize({ width: 1960, height: 1100 });
  await resetAdaptiveState(page);
  const open = await readGeometry(page);

  await page.locator('.chapter-nav-toggle').click();
  await page.waitForFunction(() => document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed'));
  const collapsed = await readGeometry(page);

  const released = open.nav.width - collapsed.nav.width;
  const articleGain = collapsed.article.width - open.article.width;
  const outlineGap = collapsed.outline.x - collapsed.article.right;
  if (articleGain < released * 0.8) {
    throw new Error(`adaptive article did not reclaim the released nav width: ${JSON.stringify({ open, collapsed, released, articleGain })}`);
  }
  if (Math.abs(collapsed.main.width - collapsed.article.width) > 2) {
    throw new Error(`adaptive article does not fill the center track: ${JSON.stringify(collapsed)}`);
  }
  if (outlineGap < 24 || outlineGap > 64) {
    throw new Error(`outline is not aligned to the adaptive shell edge: ${JSON.stringify({ outlineGap, collapsed })}`);
  }
  assertNoPageOverflow('collapsed adaptive layout', collapsed);

  await page.locator('.chapter-nav-toggle').click();
  await page.waitForFunction(() => !document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed'));
  const reopened = await readGeometry(page);
  if (Math.abs(reopened.article.width - open.article.width) > 2) {
    throw new Error(`reopened navigation did not restore article geometry: ${JSON.stringify({ open, reopened })}`);
  }
}

async function assertAdaptiveLiveResizeAndManualPrecedence(page) {
  console.log('[adaptive layout] checking live viewport response and manual precedence');
  await resetAdaptiveState(page, { navCollapsed: true });

  await page.setViewportSize({ width: 2560, height: 1100 });
  const adaptive2560 = await readGeometry(page);
  await page.setViewportSize({ width: 3440, height: 1100 });
  const adaptive3440 = await readGeometry(page);
  if (adaptive2560.shell.width < 2400 || Math.abs(adaptive3440.shell.width - 2800) > 2) {
    throw new Error(`adaptive shell did not follow viewport and cap: ${JSON.stringify({ adaptive2560, adaptive3440 })}`);
  }

  const displaySettings = page.locator('.display-settings-popover');
  if (!(await displaySettings.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Display settings' }).click();
  }
  await page.locator('.display-settings-section')
    .filter({ hasText: 'Layout Width' })
    .getByRole('button', { name: 'Standard' })
    .click();
  await page.waitForFunction(() => (
    window.localStorage.getItem('dr-reader-layout-width') === 'standard' &&
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'standard'
  ));
  const manual = await readGeometry(page);
  if (manual.article.width > 922 || manual.shell.width > 1662) {
    throw new Error(`manual Standard mode did not retain its cap: ${JSON.stringify(manual)}`);
  }

  if (!(await displaySettings.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Display settings' }).click();
  }
  await page.locator('.display-settings-section')
    .filter({ hasText: 'Layout Width' })
    .getByRole('button', { name: 'Adaptive' })
    .click();
  await page.waitForFunction(() => (
    window.localStorage.getItem('dr-reader-layout-width') === 'recommended' &&
    document.querySelector('.chapter-reader')?.getAttribute('data-layout-width') === 'adaptive'
  ));
}

async function assertExplicitRailWidths(page) {
  console.log('[adaptive layout] checking explicit rail resize precedence');
  await page.setViewportSize({ width: 1960, height: 1100 });
  await resetAdaptiveState(page);
  const initial = await readGeometry(page);

  const navResizer = page.locator('.chapter-nav-resizer');
  const navBox = await navResizer.boundingBox();
  if (!navBox) {
    throw new Error('adaptive nav resizer is not visible');
  }
  const navX = navBox.x + navBox.width / 2;
  const navY = navBox.y + Math.min(120, navBox.height / 2);
  await page.mouse.move(navX, navY);
  await page.mouse.down();
  await page.mouse.move(navX + 200, navY, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.localStorage.getItem('dr-reader-nav-width-explicit') === 'true');
  const widerNav = await readGeometry(page);
  if (widerNav.nav.width - initial.nav.width < 80 || initial.article.width - widerNav.article.width < 80) {
    throw new Error(`explicit nav resize did not transfer width from the article: ${JSON.stringify({ initial, widerNav })}`);
  }

  const outlineResizer = page.locator('.chapter-outline-resizer');
  const outlineBox = await outlineResizer.boundingBox();
  if (!outlineBox) {
    throw new Error('adaptive outline resizer is not visible');
  }
  const outlineX = outlineBox.x + outlineBox.width / 2;
  const outlineY = outlineBox.y + Math.min(120, outlineBox.height / 2);
  await page.mouse.move(outlineX, outlineY);
  await page.mouse.down();
  await page.mouse.move(outlineX + 120, outlineY, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.localStorage.getItem('dr-reader-outline-width-explicit') === 'true');
  const narrowerOutline = await readGeometry(page);
  if (initial.outline.width - narrowerOutline.outline.width < 60 || narrowerOutline.article.width - widerNav.article.width < 60) {
    throw new Error(`explicit outline resize did not transfer width to the article: ${JSON.stringify({ initial, widerNav, narrowerOutline })}`);
  }
  assertNoPageOverflow('explicit rail resize', narrowerOutline);
}

async function assertContentBlocksShareAdaptiveWidth(page) {
  console.log('[adaptive layout] checking consistent prose and technical widths');
  await page.setViewportSize({ width: 2560, height: 1100 });
  await resetAdaptiveState(page, { navCollapsed: true });
  const geometry = await readGeometry(page);

  if (geometry.proseWidth < 1500 || geometry.proseWidth > 1602) {
    throw new Error(`prose did not use the wider bounded surface: ${JSON.stringify(geometry)}`);
  }
  if (geometry.technicalWidth < 1500 || geometry.technicalWidth > 1602) {
    throw new Error(`technical content did not use its wider bounded surface: ${JSON.stringify(geometry)}`);
  }
  if (Math.abs(geometry.technicalWidth - geometry.proseWidth) > 2) {
    throw new Error(`prose and technical content use inconsistent widths: ${JSON.stringify(geometry)}`);
  }
  assertNoPageOverflow('consistent prose and technical widths', geometry);
}

async function assertReadingPositionAndFocus(page) {
  console.log('[adaptive layout] checking focus, hash, heading, and reading-position stability');
  await page.setViewportSize({ width: 1960, height: 1100 });
  await resetAdaptiveState(page);
  await page.goto(`${getBaseUrl(page.__readerPort)}${ROUTE}#${HEADING_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((headingId) => (
    window.location.hash === `#${headingId}` &&
    document.getElementById(headingId)?.getBoundingClientRect().top >= 0 &&
    document.getElementById(headingId)?.getBoundingClientRect().top < 240
  ), HEADING_ID, { timeout: 20_000 });
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await page.waitForFunction((headingText) => (
    document.querySelector('.chapter-outline-link.is-active')?.textContent?.trim() === headingText
  ), HEADING_TEXT, { timeout: 20_000 });

  const before = await page.evaluate((headingId) => ({
    hash: window.location.hash,
    top: document.getElementById(headingId)?.getBoundingClientRect().top ?? null,
    activeText: document.querySelector('.chapter-outline-link.is-active')?.textContent?.trim() ?? null,
  }), HEADING_ID);
  const toggle = page.locator('.chapter-nav-toggle');
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed'));
  const after = await page.evaluate((headingId) => ({
    hash: window.location.hash,
    top: document.getElementById(headingId)?.getBoundingClientRect().top ?? null,
    activeText: document.querySelector('.chapter-outline-link.is-active')?.textContent?.trim() ?? null,
    toggleFocused: document.activeElement?.classList.contains('chapter-nav-toggle') ?? false,
  }), HEADING_ID);

  if (
    before.hash !== after.hash ||
    before.activeText !== after.activeText ||
    !after.toggleFocused ||
    Math.abs((after.top ?? 0) - (before.top ?? 0)) > 160
  ) {
    throw new Error(`adaptive reflow lost reading context: ${JSON.stringify({ before, after })}`);
  }
}

async function readMermaidOverflow(page) {
  return page.locator('.chapter-article .mermaid').first().evaluate((container) => {
    const shell = container.querySelector('.mermaid-scroll-shell');
    const svg = shell?.querySelector('svg');
    if (!(shell instanceof HTMLElement) || !(svg instanceof SVGElement)) {
      throw new Error('Mermaid surface is incomplete');
    }
    return {
      actual: shell.scrollWidth - shell.clientWidth > 1,
      reported: container.dataset.mermaidOverflowing === 'true',
      sameSvg: svg.getAttribute('data-adaptive-test-instance') === 'original',
    };
  });
}

async function assertMermaidOverflowResynchronizes(page) {
  console.log('[adaptive layout] checking Mermaid overflow resynchronization');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await resetAdaptiveState(page, { mermaidZoom: 100 });
  const mermaid = page.locator('.chapter-article .mermaid').first();
  await mermaid.scrollIntoViewIfNeeded();
  await mermaid.locator('svg').waitFor({ state: 'visible', timeout: 20_000 });
  await mermaid.locator('svg').evaluate((svg) => svg.setAttribute('data-adaptive-test-instance', 'original'));
  const narrow = await readMermaidOverflow(page);

  await page.locator('.chapter-nav-toggle').click();
  await page.waitForFunction(() => document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed'));
  await page.setViewportSize({ width: 1960, height: 1000 });
  await page.waitForFunction(() => {
    const container = document.querySelector('.chapter-article .mermaid');
    const shell = container?.querySelector('.mermaid-scroll-shell');
    return shell instanceof HTMLElement &&
      (shell.scrollWidth - shell.clientWidth > 1) === (container?.dataset.mermaidOverflowing === 'true');
  });
  const wide = await readMermaidOverflow(page);

  if (narrow.actual !== narrow.reported || wide.actual !== wide.reported || !wide.sameSvg) {
    throw new Error(`Mermaid observer did not resynchronize: ${JSON.stringify({ narrow, wide })}`);
  }
}

async function assertBreakpointBoundaryMatrix(page) {
  console.log('[adaptive layout] checking responsive breakpoint and preference matrix');
  const widths = [1261, 1260, 1259, 981, 980, 979, 721, 720, 719, 320];
  const configurations = [
    {
      preference: 'recommended',
      expectedMode: 'adaptive',
      textSize: 'standard',
      theme: 'dark',
      navCollapsed: false,
    },
    {
      preference: 'recommended',
      expectedMode: 'adaptive',
      textSize: 'large',
      theme: 'light',
      navCollapsed: true,
    },
    {
      preference: 'standard',
      expectedMode: 'standard',
      textSize: 'standard',
      theme: 'light',
      navCollapsed: false,
    },
    {
      preference: 'wide',
      expectedMode: 'wide',
      textSize: 'large',
      theme: 'dark',
      navCollapsed: true,
    },
    {
      preference: 'comfort',
      expectedMode: 'comfort',
      textSize: 'large',
      theme: 'light',
      navCollapsed: false,
    },
  ];
  const failures = [];

  for (const configuration of configurations) {
    await page.setViewportSize({ width: widths[0], height: 1000 });
    await page.goto(`${getBaseUrl(page.__readerPort)}${ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((settings) => {
      window.localStorage.setItem('dr-reader-layout-width', settings.preference);
      window.localStorage.setItem('dr-reader-text-size', settings.textSize);
      window.localStorage.setItem('dr-reader-theme', settings.theme);
      window.localStorage.setItem('dr-reader-nav-collapsed', settings.navCollapsed ? 'true' : 'false');
      window.localStorage.setItem('dr-reader-nav-width-explicit', 'false');
      window.localStorage.setItem('dr-reader-outline-width-explicit', 'false');
    }, configuration);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction((settings) => (
      document.documentElement.dataset.theme === settings.theme &&
      document.documentElement.dataset.textSize === settings.textSize &&
      document.querySelector('.chapter-reader')?.dataset.layoutWidth === settings.expectedMode &&
      document.querySelector('.chapter-reader')?.classList.contains('nav-collapsed') === settings.navCollapsed &&
      Boolean(document.querySelector('.chapter-article'))
    ), configuration, { timeout: 20_000 });

    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      }));
      const geometry = await page.evaluate(() => {
        const box = (selector) => {
          const node = document.querySelector(selector);
          if (!(node instanceof Element)) {
            return null;
          }
          const rect = node.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
          };
        };
        const display = (selector) => {
          const node = document.querySelector(selector);
          return node instanceof Element ? getComputedStyle(node).display : null;
        };

        return {
          mode: document.querySelector('.chapter-reader')?.dataset.layoutWidth ?? null,
          theme: document.documentElement.dataset.theme ?? null,
          textSize: document.documentElement.dataset.textSize ?? null,
          shell: box('.chapter-reader'),
          nav: box('.chapter-nav-sidebar'),
          main: box('.chapter-main-column'),
          article: box('.chapter-article'),
          outline: box('.chapter-outline-sidebar'),
          navResizerDisplay: display('.chapter-nav-resizer-slot'),
          outlineResizerDisplay: display('.chapter-outline-resizer-slot'),
          pageOverflow: Math.max(
            document.documentElement.scrollWidth - window.innerWidth,
            document.body.scrollWidth - window.innerWidth,
          ),
        };
      });
      const label = `${configuration.expectedMode}/${configuration.textSize}/${configuration.theme}/${configuration.navCollapsed ? 'collapsed' : 'open'}@${width}`;
      const withinViewport = (box) => (
        box &&
        box.left >= -1 &&
        box.right <= width + 1 &&
        box.width > 0
      );

      if (
        geometry.mode !== configuration.expectedMode ||
        geometry.theme !== configuration.theme ||
        geometry.textSize !== configuration.textSize
      ) {
        failures.push(`${label}: preference state drifted`);
      }
      if (geometry.pageOverflow > 1) {
        failures.push(`${label}: page overflow ${geometry.pageOverflow}px`);
      }
      if (
        !withinViewport(geometry.shell) ||
        !withinViewport(geometry.article) ||
        !withinViewport(geometry.outline)
      ) {
        failures.push(`${label}: shell/article/outline escaped the viewport`);
      }

      if (width > 1260) {
        if (
          geometry.outline.left < geometry.article.right - 1 ||
          Math.abs(geometry.shell.right - geometry.outline.right) > 1
        ) {
          failures.push(`${label}: desktop outline alignment failed`);
        }
      } else {
        if (
          geometry.outlineResizerDisplay !== 'none' ||
          Math.abs(geometry.outline.left - geometry.shell.left) > 1 ||
          Math.abs(geometry.outline.right - geometry.shell.right) > 1 ||
          geometry.outline.top < geometry.main.bottom - 1
        ) {
          failures.push(`${label}: stacked outline geometry failed`);
        }
      }

      if (width <= 980) {
        if (
          geometry.navResizerDisplay !== 'none' ||
          Math.abs(geometry.main.left - geometry.shell.left) > 1 ||
          Math.abs(geometry.main.right - geometry.shell.right) > 1 ||
          Math.abs(geometry.nav.left - geometry.shell.left) > 1 ||
          Math.abs(geometry.nav.right - geometry.shell.right) > 1
        ) {
          failures.push(`${label}: single-column geometry failed`);
        }
      } else if (width <= 1260 && geometry.main.left < geometry.nav.right - 1) {
        failures.push(`${label}: stacked-outline desktop columns overlap`);
      }
    }
  }

  if (failures.length) {
    throw new Error(`responsive matrix failures:\n${failures.join('\n')}`);
  }
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
    context = await browser.newContext({ viewport: { width: 1960, height: 1100 } });
    const page = await context.newPage();
    page.__readerPort = serverHandle.port;

    await assertAdaptiveReclaimsNavWidth(page);
    await assertAdaptiveLiveResizeAndManualPrecedence(page);
    await assertExplicitRailWidths(page);
    await assertContentBlocksShareAdaptiveWidth(page);
    await assertReadingPositionAndFocus(page);
    await assertMermaidOverflowResynchronizes(page);
    await assertBreakpointBoundaryMatrix(page);

    console.log('[adaptive layout] all adaptive reader checks passed');
  } finally {
    await context?.close();
    await browser?.close();
    await stopServer(await server);
  }
}

withReaderSmokeRunLock(main).catch((error) => {
  console.error('[adaptive layout] failed');
  console.error(error);
  process.exitCode = 1;
});
