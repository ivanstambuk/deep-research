import process from 'process';
import { runCommand } from './test-reader-smoke-helpers.mjs';

const STEPS = [
  ['node', ['scripts/test-published-link-migrations.mjs']],
  ['node', ['scripts/test-cross-reference-links.mjs']],
  ['node', ['scripts/test-reader-inline-directives.mjs']],
  ['node', ['scripts/test-reader-chapter-routes.mjs']],
  ['node', ['scripts/test-reader-adaptive-layout.mjs']],
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
