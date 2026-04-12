import { spawn } from 'child_process';
import process from 'process';
import { setTimeout as delay } from 'timers/promises';

export const TEST_PORT = Number(process.env.READER_SMOKE_PORT ?? 4300 + (process.pid % 500));
export const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
export const SERVER_START_TIMEOUT_MS = 30_000;

export async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
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

export function startServer() {
  const server = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(TEST_PORT), '--strictPort'],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  server.__exited = false;
  server.on('exit', () => {
    server.__exited = true;
  });

  return server;
}

export async function waitForFreshServer(url, server, timeoutMs = SERVER_START_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    if (server?.__exited || server?.exitCode !== null) {
      throw new Error(`Vite dev server exited before becoming ready for ${url}`);
    }

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

  throw new Error(`Timed out waiting for fresh Vite server at ${url}: ${String(lastError)}`);
}

export async function stopServer(server) {
  if (!server || server.killed) {
    return;
  }

  server.kill('SIGTERM');
  await delay(500);
}
