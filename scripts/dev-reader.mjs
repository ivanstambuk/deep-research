import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const logDir = path.join(rootDir, '.scratch', 'logs');
const latestLogPath = path.join(logDir, 'reader-dev-latest.log');
const sessionStamp = new Date().toISOString().replace(/[:.]/g, '-');
const sessionLogPath = path.join(logDir, `reader-dev-${sessionStamp}.log`);

fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(latestLogPath, '');

const sessionLog = fs.createWriteStream(sessionLogPath, { flags: 'a' });
const latestLog = fs.createWriteStream(latestLogPath, { flags: 'a' });

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  sessionLog.write(line);
  latestLog.write(line);
}

function pipeStream(stream, label) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    process[label].write(text);
    sessionLog.write(text);
    latestLog.write(text);
  });
}

function closeLogs() {
  sessionLog.end();
  latestLog.end();
}

function runCommand(command, commandArgs, label) {
  writeLog(`${label}: spawn ${command} ${commandArgs.join(' ')}`);

  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  pipeStream(child.stdout, 'stdout');
  pipeStream(child.stderr, 'stderr');

  child.on('error', (error) => {
    writeLog(`${label}: child process error: ${error.stack || error.message}`);
  });

  return child;
}

let activeChild = null;

function forwardSignal(signal) {
  writeLog(`wrapper: received ${signal}`);
  if (activeChild && !activeChild.killed) {
    activeChild.kill(signal);
    return;
  }
  closeLogs();
  process.exit(128);
}

for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
  process.on(signal, () => forwardSignal(signal));
}

process.on('uncaughtException', (error) => {
  writeLog(`wrapper: uncaughtException: ${error.stack || error.message}`);
  closeLogs();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  writeLog(`wrapper: unhandledRejection: ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`);
  closeLogs();
  process.exit(1);
});

writeLog(`wrapper: starting in ${rootDir}`);
writeLog(`wrapper: session log -> ${sessionLogPath}`);

function exitWithChild(label, code, signal) {
  if (signal) {
    writeLog(`${label}: exited due to signal ${signal}`);
    closeLogs();
    process.exit(128);
  }

  writeLog(`${label}: exited with code ${code ?? 0}`);
  if ((code ?? 0) !== 0) {
    closeLogs();
    process.exit(code ?? 1);
  }
}

function startVite() {
  activeChild = runCommand(
    path.join(rootDir, 'node_modules', '.bin', 'vite'),
    ['--host', '127.0.0.1', '--port', '4322', '--strictPort'],
    'vite'
  );

  activeChild.on('exit', (code, signal) => {
    exitWithChild('vite', code, signal);
    closeLogs();
    process.exit(code ?? 0);
  });
}

activeChild = runCommand('npm', ['run', 'prepare:reader:raw'], 'prepare:reader');
activeChild.on('exit', (code, signal) => {
  exitWithChild('prepare:reader', code, signal);
  if ((code ?? 0) === 0 && !signal) {
    startVite();
  } else {
    closeLogs();
    process.exit(code ?? 1);
  }
});
