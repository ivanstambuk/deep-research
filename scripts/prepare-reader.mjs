import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync, spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const ensureLive = args.has('--ensure-live');
const port = 4322;
const host = '127.0.0.1';
const rootDir = process.cwd();
const logDir = path.join(rootDir, '.scratch', 'logs');
const latestLogPath = path.join(logDir, 'reader-live-latest.log');
const sessionStamp = new Date().toISOString().replace(/[:.]/g, '-');
const sessionLogPath = path.join(logDir, `reader-live-${sessionStamp}.log`);
const vitePath = path.join(rootDir, 'node_modules', '.bin', 'vite');

function runCommand(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${commandArgs.join(' ')} exited due to signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${code}`));
    });
  });
}

function getListeningPid() {
  try {
    const output = execFileSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!output) {
      return null;
    }

    return Number.parseInt(output.split('\n')[0], 10);
  } catch {
    return null;
  }
}

function getProcessCommand(pid) {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function isReaderViteProcess(command) {
  return command.includes('node_modules/.bin/vite') || command.includes('/vite --host 127.0.0.1 --port 4322');
}

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });
  });
}

async function waitForPortState(expectedOpen, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if ((await isPortOpen()) === expectedOpen) {
      return;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for port ${port} to become ${expectedOpen ? 'ready' : 'free'}`);
}

async function stopReaderServerIfRunning() {
  const pid = getListeningPid();
  if (!pid) {
    return false;
  }

  const command = getProcessCommand(pid);
  if (!isReaderViteProcess(command)) {
    throw new Error(`Port ${port} is occupied by a non-reader process: ${command || pid}`);
  }

  console.log(`[prepare:reader] stopping live reader server pid=${pid}`);
  process.kill(pid, 'SIGTERM');

  try {
    await waitForPortState(false, 10_000);
  } catch {
    console.log(`[prepare:reader] forcing reader server pid=${pid} to exit`);
    process.kill(pid, 'SIGKILL');
    await waitForPortState(false, 5_000);
  }

  return true;
}

async function startReaderServerDetached() {
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(latestLogPath, '');

  const sessionFd = fs.openSync(sessionLogPath, 'a');
  const latestFd = fs.openSync(latestLogPath, 'a');
  const child = spawn(vitePath, ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: rootDir,
    env: process.env,
    detached: true,
    stdio: ['ignore', sessionFd, latestFd],
  });

  child.unref();
  fs.closeSync(sessionFd);
  fs.closeSync(latestFd);

  await waitForPortState(true, 15_000);
  console.log(`[prepare:reader] live reader server restarted on http://${host}:${port}/`);
  console.log(`[prepare:reader] log: ${sessionLogPath}`);
}

async function main() {
  const hadLiveServer = await stopReaderServerIfRunning();
  await runCommand('npm', ['run', 'prepare:reader:raw']);

  if (hadLiveServer || ensureLive) {
    await startReaderServerDetached();
  } else {
    console.log('[prepare:reader] no live reader server was running; skipped restart');
  }
}

main().catch((error) => {
  console.error('[prepare:reader] failed');
  console.error(error);
  process.exitCode = 1;
});
