import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();

function run(cmd, args) {
  execFileSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function normalizePath(file) {
  return file.replace(/\\/g, '/');
}

function toMirrorPath(file) {
  const normalized = normalizePath(file);
  if (normalized.startsWith('src/papers/') && normalized.endsWith('.mdx')) {
    return normalized.replace(/^src\//, '').replace(/\.mdx$/, '.md');
  }
  return normalized;
}

function collectChangedFiles() {
  const output = execFileSync(
    'git',
    ['status', '--short', '--untracked-files=all'],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map(normalizePath)
    .filter((file) => (
      (file.startsWith('src/papers/') && file.endsWith('.mdx'))
      || /^papers\/DR-\d{4}\/DR-\d{4}-.*\.md$/.test(file)
    ));
}

function main() {
  const inputFiles = process.argv.slice(2).map(normalizePath);
  const candidateFiles = inputFiles.length ? inputFiles : collectChangedFiles();

  if (!candidateFiles.length) {
    console.log('No changed DR Markdown/MDX files found for Mermaid validation.');
    console.log('Usage: npm run validate:mermaid -- <src/papers/...mdx | papers/...md>');
    return;
  }

  const mdxSources = candidateFiles.filter((file) => file.startsWith('src/papers/') && file.endsWith('.mdx'));
  if (mdxSources.length) {
    run('node', ['scripts/compile-mdx.js', ...mdxSources]);
  }

  const mirrors = Array.from(new Set(
    candidateFiles
      .map(toMirrorPath)
      .filter((file) => /^papers\/DR-\d{4}\/DR-\d{4}-.*\.md$/.test(file)),
  ));

  if (!mirrors.length) {
    console.log('No DR Markdown mirrors resolved for Mermaid validation.');
    process.exitCode = 1;
    return;
  }

  for (const mirror of mirrors) {
    run('python3', ['.githooks/validate-mermaid-rendering.py', '--full-file', mirror]);
  }
}

main();
