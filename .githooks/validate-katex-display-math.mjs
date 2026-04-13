#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import katex from 'katex';

const EXEC_OPTIONS = {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
};

function getStagedContent(filepath) {
  return execFileSync('git', ['show', `:${filepath}`], EXEC_OPTIONS);
}

function getChangedRanges(filepath) {
  const diff = execFileSync('git', ['diff', '--cached', '-U0', '--', filepath], EXEC_OPTIONS);
  const ranges = [];

  for (const line of diff.split(/\r?\n/)) {
    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!match) {
      continue;
    }

    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    const end = count === 0 ? start : start + count - 1;
    ranges.push({ start, end });
  }

  return ranges;
}

function findMathDelimiter(line, startIndex = 0) {
  let inlineCodeFence = null;

  for (let index = startIndex; index < line.length; index += 1) {
    if (line[index] === '`') {
      let tickCount = 1;
      while (index + tickCount < line.length && line[index + tickCount] === '`') {
        tickCount += 1;
      }

      if (inlineCodeFence === null) {
        inlineCodeFence = tickCount;
      } else if (inlineCodeFence === tickCount) {
        inlineCodeFence = null;
      }

      index += tickCount - 1;
      continue;
    }

    if (inlineCodeFence === null && line[index] === '$' && line[index + 1] === '$') {
      return index;
    }
  }

  return -1;
}

function extractDisplayMathBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let inCode = false;
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];
    const stripped = line.trim();

    if (stripped.startsWith('```')) {
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      continue;
    }

    if (!current) {
      const openPos = findMathDelimiter(line);
      if (openPos === -1) {
        continue;
      }

      const afterOpen = line.slice(openPos + 2);
      const closePos = findMathDelimiter(afterOpen);

      if (closePos !== -1) {
        blocks.push({
          startLine: lineNumber,
          endLine: lineNumber,
          content: afterOpen.slice(0, closePos),
        });
        continue;
      }

      current = {
        startLine: lineNumber,
        parts: [afterOpen],
      };
      continue;
    }

    const closePos = findMathDelimiter(line);
    if (closePos !== -1) {
      current.parts.push(line.slice(0, closePos));
      blocks.push({
        startLine: current.startLine,
        endLine: lineNumber,
        content: current.parts.join('\n'),
      });
      current = null;
      continue;
    }

    current.parts.push(line);
  }

  return blocks;
}

function intersectsChangedRange(block, ranges) {
  return ranges.some((range) => block.startLine <= range.end && block.endLine >= range.start);
}

function previewBlock(content) {
  return content
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function validateFile(filepath) {
  const changedRanges = getChangedRanges(filepath);
  if (changedRanges.length === 0) {
    return [];
  }

  const content = getStagedContent(filepath);
  const blocks = extractDisplayMathBlocks(content).filter((block) => intersectsChangedRange(block, changedRanges));
  const failures = [];

  for (const block of blocks) {
    try {
      katex.renderToString(block.content, {
        displayMode: true,
        throwOnError: true,
        strict: 'ignore',
      });
    } catch (error) {
      failures.push({
        startLine: block.startLine,
        endLine: block.endLine,
        message: error instanceof Error ? error.message : String(error),
        preview: previewBlock(block.content),
      });
    }
  }

  return failures;
}

function printFailures(filepath, failures) {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ❌ CHECK 33: KaTeX display math parse failure detected        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  File: ${filepath}`);
  console.log('');
  console.log('  WHAT HAPPENED:');
  console.log('    A staged display-math block touched by this commit does not parse');
  console.log('    under KaTeX. This would render as red fallback text in the reader.');
  console.log('');
  console.log('  HOW TO FIX:');
  console.log('    Correct the LaTeX syntax in the changed $$...$$ block and re-stage');
  console.log('    the file. Common causes: malformed alignment, missing environment');
  console.log('    opener/closer, or Markdown text accidentally captured inside math.');
  console.log('');

  for (const failure of failures) {
    const lines =
      failure.startLine === failure.endLine
        ? `line ${failure.startLine}`
        : `lines ${failure.startLine}-${failure.endLine}`;
    console.log(`  ${lines}: ${failure.message}`);
    console.log(`    preview: ${failure.preview}`);
    console.log('');
  }
}

let hadFailures = false;

for (const filepath of process.argv.slice(2)) {
  const failures = validateFile(filepath);
  if (failures.length > 0) {
    printFailures(filepath, failures);
    hadFailures = true;
  }
}

process.exit(hadFailures ? 1 : 0);
