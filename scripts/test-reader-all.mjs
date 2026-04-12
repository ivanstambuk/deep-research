import process from 'process';
import { runCommand } from './test-reader-smoke-helpers.mjs';

const STEPS = [
  ['npm', ['run', 'test:reader:deep-links']],
  ['npm', ['run', 'test:reader:debug-target-navigation']],
  ['npm', ['run', 'test:reader:debug-mermaid']],
  ['npm', ['run', 'test:reader:mermaid-search']],
];

async function main() {
  for (const [command, args] of STEPS) {
    await runCommand(command, args);
  }

  console.log('[reader smoke] all serialized reader checks passed');
}

main().catch((error) => {
  console.error('[reader smoke] serialized reader checks failed');
  console.error(error);
  process.exitCode = 1;
});
