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
import { readDebugMarker } from './test-reader-target-first-helpers.mjs';

const TARGET_TOP_MIN = 0;
const TARGET_TOP_MAX = 180;

const CASES = [
  {
    name: 'DR-0001 near-top deep link',
    path: '/DR-0001-mcp-authentication-authorization-agent-identity#1-mcp-authorization-spec-evolution',
    targetId: '1-mcp-authorization-spec-evolution',
  },
  {
    name: 'DR-0001 far deferred deep link',
    path: '/DR-0001-mcp-authentication-authorization-agent-identity#25-session-token-binding-reference-implementation',
    targetId: '25-session-token-binding-reference-implementation',
  },
  {
    name: 'DR-0001 appendix deep link',
    path: '/DR-0001-mcp-authentication-authorization-agent-identity#appendix-g-wso2-identity-serverasgardeo-idp-native-mcp-authorization',
    targetId: 'appendix-g-wso2-identity-serverasgardeo-idp-native-mcp-authorization',
  },
  {
    name: 'DR-0002 far deferred deep link',
    path: '/DR-0002-eudi-wallet-relying-party-integration#29-security-threat-catalogue',
    targetId: '29-security-threat-catalogue',
  },
];

async function assertDeepLink(page, testCase) {
  const baseUrl = getBaseUrl(page.__readerPort);
  const url = `${baseUrl}${testCase.path.includes('?') ? `${testCase.path}&` : `${testCase.path.replace('#', '?debug=reader,target_navigation&debug_ui=panel#')}`}`;
  console.log(`[deep-link smoke] checking ${testCase.name}: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-reader-debug="state"]', {
    state: 'attached',
    timeout: 20_000,
  });
  await page.waitForFunction(
    (targetId) => Boolean(document.getElementById(targetId)),
    testCase.targetId,
    { timeout: 20_000 },
  );
  try {
    await page.waitForFunction(
      ({ targetId, minTop, maxTop }) => {
        const target = document.getElementById(targetId);
        const article = document.querySelector('.doc-article');
        const debugState = document.querySelector('[data-reader-debug="state"]');
        if (!target || !article) {
          return false;
        }

        const rect = target.getBoundingClientRect();
        const headingCount = article.querySelectorAll('h2, h3, h4, h5, h6').length;

        return (
          rect.top >= minTop &&
          rect.top <= maxTop &&
          headingCount >= 5 &&
          debugState?.getAttribute('data-debug-route')?.includes(`#${targetId}`) &&
          debugState?.getAttribute('data-debug-navigation-mode') === 'target_first' &&
          debugState?.getAttribute('data-debug-target-ready') === 'true' &&
          debugState?.getAttribute('data-debug-target-stable') === 'true' &&
          debugState?.getAttribute('data-debug-reveal-mode') === 'revealed' &&
          debugState?.getAttribute('data-debug-visible-article-before-reveal') === 'false' &&
          Number(debugState?.getAttribute('data-debug-early-reveal-count') ?? '0') === 0 &&
          Number(debugState?.getAttribute('data-debug-early-toc-transfer-count') ?? '0') === 0 &&
          Number(debugState?.getAttribute('data-debug-multi-jump-count') ?? '0') === 0
        );
      },
      {
        targetId: testCase.targetId,
        minTop: TARGET_TOP_MIN,
        maxTop: TARGET_TOP_MAX,
      },
      { timeout: 20_000 },
    );
  } catch (error) {
    const diagnostic = await page.evaluate((targetId) => {
      const target = document.getElementById(targetId);
      const article = document.querySelector('.doc-article');
      const debugState = document.querySelector('[data-reader-debug="state"]');
      return {
        targetTop: target?.getBoundingClientRect().top ?? null,
        headingCount: article?.querySelectorAll('h2, h3, h4, h5, h6').length ?? 0,
        textSample: target?.textContent?.slice(0, 120) ?? null,
        route: debugState?.getAttribute('data-debug-route') ?? null,
        navigationMode: debugState?.getAttribute('data-debug-navigation-mode') ?? null,
        targetReady: debugState?.getAttribute('data-debug-target-ready') ?? null,
        targetStable: debugState?.getAttribute('data-debug-target-stable') ?? null,
        revealMode: debugState?.getAttribute('data-debug-reveal-mode') ?? null,
        visibleArticleBeforeReveal: debugState?.getAttribute('data-debug-visible-article-before-reveal') ?? null,
        earlyRevealCount: debugState?.getAttribute('data-debug-early-reveal-count') ?? null,
        earlyTocTransferCount: debugState?.getAttribute('data-debug-early-toc-transfer-count') ?? null,
        multiJumpCount: debugState?.getAttribute('data-debug-multi-jump-count') ?? null,
      };
    }, testCase.targetId);
    console.error(`[deep-link smoke] diagnostic for ${testCase.name}:`, diagnostic);
    throw error;
  }

  const result = await page.evaluate((targetId) => {
    const target = document.getElementById(targetId);
    const article = document.querySelector('.doc-article');
    const debugState = document.querySelector('[data-reader-debug="state"]');
    return {
      targetTop: target?.getBoundingClientRect().top ?? null,
      headingCount: article?.querySelectorAll('h2, h3, h4, h5, h6').length ?? 0,
      placeholderCount: article?.querySelectorAll('.doc-section-placeholder').length ?? 0,
      scrollCommands: Number(debugState?.getAttribute('data-debug-scroll-command-count') ?? '0'),
    };
  }, testCase.targetId);

  console.log(
    `[deep-link smoke] ${testCase.name}: top=${Math.round(result.targetTop ?? -1)} headings=${result.headingCount} scrollCommands=${result.scrollCommands}`,
  );

  const state = await readDebugMarker(page);
  if (state.navigationMode !== 'target_first' || state.scrollCommandCount !== 1) {
    throw new Error(
      `[deep-link smoke] unexpected final marker state for ${testCase.name}: mode=${state.navigationMode} scrollCommands=${state.scrollCommandCount}`,
    );
  }
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

    for (const testCase of CASES) {
      await assertDeepLink(page, testCase);
    }

    console.log('[deep-link smoke] all cases passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(await server);
  }
}

withReaderSmokeRunLock(main).catch((error) => {
  console.error('[deep-link smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
