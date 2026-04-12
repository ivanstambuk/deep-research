import { spawn } from 'child_process';
import fs from 'fs/promises';
import net from 'net';
import os from 'os';
import path from 'path';
import process from 'process';
import { setTimeout as delay } from 'timers/promises';

export const SERVER_START_TIMEOUT_MS = 30_000;
const READER_BUILD_LOCK_PATH = path.join(os.tmpdir(), 'deep-research-reader-build.lock');
const READER_SMOKE_LOCK_PATH = path.join(os.tmpdir(), 'deep-research-reader-smoke.lock');

function reserveEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

export function getBaseUrl(port) {
  return `http://127.0.0.1:${port}`;
}

async function withReaderBuildLock(task) {
  let handle = null;

  while (!handle) {
    try {
      handle = await fs.open(READER_BUILD_LOCK_PATH, 'wx');
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      await delay(200);
    }
  }

  try {
    return await task();
  } finally {
    await handle.close();
    await fs.rm(READER_BUILD_LOCK_PATH, { force: true });
  }
}

export async function withReaderSmokeRunLock(task) {
  let handle = null;

  while (!handle) {
    try {
      handle = await fs.open(READER_SMOKE_LOCK_PATH, 'wx');
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      await delay(200);
    }
  }

  try {
    return await task();
  } finally {
    await handle.close();
    await fs.rm(READER_SMOKE_LOCK_PATH, { force: true });
  }
}

export async function runCommand(command, args) {
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });

  if (command === 'node' && args.join(' ') === 'scripts/build-reader-assets.js') {
    await withReaderBuildLock(run);
    return;
  }

  await run();
}

export async function waitForServer(url, timeoutMs = SERVER_START_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for Vite server at ${url}: ${String(lastError)}`);
}

export async function startServer() {
  const port = Number(process.env.READER_SMOKE_PORT) || await reserveEphemeralPort();
  const server = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      stdio: 'inherit',
      env: process.env,
      detached: true,
    },
  );

  server.__exited = false;
  server.on('exit', () => {
    server.__exited = true;
  });

  return {
    process: server,
    port,
    baseUrl: getBaseUrl(port),
  };
}

export async function waitForFreshServer(serverHandle, timeoutMs = SERVER_START_TIMEOUT_MS) {
  const { baseUrl, process: server } = serverHandle;
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    if (server?.__exited || server?.exitCode !== null) {
      throw new Error(`Vite dev server exited before becoming ready for ${baseUrl}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for fresh Vite server at ${baseUrl}: ${String(lastError)}`);
}

export async function stopServer(serverHandle) {
  const server = serverHandle?.process ?? serverHandle;
  if (!server || server.killed) {
    return;
  }

  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
  await delay(500);
}

export async function installReaderDebugHistory(page) {
  await page.addInitScript(() => {
    window.__readerDebugHistory = [];

    const capture = (node) => {
      if (!(node instanceof HTMLElement) || node.getAttribute('data-reader-debug') !== 'state') {
        return;
      }

      const snapshot = {
        route: node.getAttribute('data-debug-route'),
        navigationPhase: node.getAttribute('data-debug-navigation-phase'),
        navigationMode: node.getAttribute('data-debug-navigation-mode'),
        resolvedTarget: node.getAttribute('data-debug-resolved-target'),
        targetContentClass: node.getAttribute('data-debug-target-content-class'),
        targetReady: node.getAttribute('data-debug-target-ready'),
        targetStable: node.getAttribute('data-debug-target-stable'),
        revealMode: node.getAttribute('data-debug-reveal-mode'),
        visibleArticleBeforeReveal: node.getAttribute('data-debug-visible-article-before-reveal'),
        tocOwner: node.getAttribute('data-debug-toc-owner'),
        scrollOwner: node.getAttribute('data-debug-scroll-owner'),
        scrollCommandCount: Number(node.getAttribute('data-debug-scroll-command-count') ?? '0'),
      };

      const lastSnapshot = window.__readerDebugHistory[window.__readerDebugHistory.length - 1];
      if (JSON.stringify(lastSnapshot) !== JSON.stringify(snapshot)) {
        window.__readerDebugHistory.push(snapshot);
      }
    };

    const observer = new MutationObserver(() => {
      const node = document.querySelector('[data-reader-debug="state"]');
      if (node) {
        capture(node);
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'data-debug-route',
        'data-debug-navigation-phase',
        'data-debug-navigation-mode',
        'data-debug-resolved-target',
        'data-debug-target-content-class',
        'data-debug-target-ready',
        'data-debug-target-stable',
        'data-debug-reveal-mode',
        'data-debug-visible-article-before-reveal',
        'data-debug-toc-owner',
        'data-debug-scroll-owner',
        'data-debug-scroll-command-count',
      ],
    });

    window.addEventListener('DOMContentLoaded', () => {
      const record = () => {
        const node = document.querySelector('[data-reader-debug="state"]');
        if (node) {
          capture(node);
        }
      };

      record();
      window.setInterval(record, 50);
    }, { once: true });
  });
}

export async function readReaderDebugHistory(page) {
  return page.evaluate(() => window.__readerDebugHistory ?? []);
}
