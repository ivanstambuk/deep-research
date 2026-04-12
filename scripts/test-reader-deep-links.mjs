import process from 'process';
import { chromium } from 'playwright';
import {
  BASE_URL,
  runCommand,
  startServer,
  stopServer,
  waitForFreshServer,
} from './test-reader-smoke-helpers.mjs';

const TARGET_TOP_MIN = 40;
const TARGET_TOP_MAX = 220;

const CASES = [
  {
    name: 'DR-0001 far deferred deep link',
    path: '/DR-0001-mcp-authentication-authorization-agent-identity#25-session-token-binding-reference-implementation',
    targetId: '25-session-token-binding-reference-implementation',
  },
  {
    name: 'DR-0002 far deferred deep link',
    path: '/DR-0002-eudi-wallet-relying-party-integration#29-security-threat-catalogue',
    targetId: '29-security-threat-catalogue',
  },
];

async function assertDeepLink(page, testCase) {
  const url = `${BASE_URL}${testCase.path}`;
  console.log(`[deep-link smoke] checking ${testCase.name}: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
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
        if (!target || !article) {
          return false;
        }

        const rect = target.getBoundingClientRect();
        const headingCount = article.querySelectorAll('h2, h3, h4, h5, h6').length;

        return (
          rect.top >= minTop &&
          rect.top <= maxTop &&
          headingCount >= 5
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
      return {
        targetTop: target?.getBoundingClientRect().top ?? null,
        headingCount: article?.querySelectorAll('h2, h3, h4, h5, h6').length ?? 0,
        textSample: target?.textContent?.slice(0, 120) ?? null,
      };
    }, testCase.targetId);
    console.error(`[deep-link smoke] diagnostic for ${testCase.name}:`, diagnostic);
    throw error;
  }

  const result = await page.evaluate((targetId) => {
    const target = document.getElementById(targetId);
    const article = document.querySelector('.doc-article');
    return {
      targetTop: target?.getBoundingClientRect().top ?? null,
      headingCount: article?.querySelectorAll('h2, h3, h4, h5, h6').length ?? 0,
      placeholderCount: article?.querySelectorAll('.doc-section-placeholder').length ?? 0,
    };
  }, testCase.targetId);

  console.log(
    `[deep-link smoke] ${testCase.name}: top=${Math.round(result.targetTop ?? -1)} headings=${result.headingCount}`,
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

    for (const testCase of CASES) {
      await assertDeepLink(page, testCase);
    }

    console.log('[deep-link smoke] all cases passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error('[deep-link smoke] failed');
  console.error(error);
  process.exitCode = 1;
});
