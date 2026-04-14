import fs from 'fs/promises';
import path from 'path';
import GithubSlugger from 'github-slugger';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import {
  applyTextReplacements,
  buildSectionTargetIndex,
  collectMarkdownCrossReferenceReplacements,
  normalizeWhitespace,
  slugifyHeadingText,
} from './cross-reference-links.js';
import { lowerDirectivesToMarkdown } from './directives.js';

function syncVisibleLineCount(output) {
  let next = output;

  for (let i = 0; i < 3; i += 1) {
    const totalLines = next.split('\n').length;
    const rounded = Math.round(totalLines / 100) * 100;
    const replacement = `~${rounded.toLocaleString('en-US')} lines`;
    next = next.replace(/~\d{1,3}(?:,\d{3})* lines/, replacement);
  }

  return next;
}

function normalizeCrossReferenceTypography(output) {
  return output
    .replace(/\(\s*[sS]ee\s+(§[0-9]+(?:\.[0-9]+)*)\s*\)/g, '($1)')
    .replace(/\(\s*[Ss]ection\s+([0-9]+(?:\.[0-9]+)*)\s*\)/g, '(§$1)')
    .replace(/(?<=\s)[Ss]ection\s+([0-9]+(?:\.[0-9]+)*)\b(?!\s*of\b)/g, '§$1')
    .replace(/(?<=\s)[Cc]hapter\s+([0-9]+(?:\.[0-9]+)*)\b(?!\s*of\b)/g, '§$1');
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function extractMdastText(node) {
  if (!node) {
    return '';
  }

  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value ?? '';
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map(extractMdastText).join('');
}

function collectMarkdownHeadingTargets(tree) {
  const slugger = new GithubSlugger();
  const headings = [];

  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'heading' && node.depth >= 2 && node.depth <= 6) {
      const { id, text } = slugifyHeadingText(normalizeWhitespace(extractMdastText(node)), slugger);
      if (text) {
        headings.push({
          headingId: id,
          text,
        });
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return headings;
}

// This script compiles .mdx from `src/papers/` into pure .md in the root `papers/`
async function compileMdxToMarkdown() {
  const srcPapersDir = path.join(process.cwd(), 'src', 'papers');
  const targetPapersDir = path.join(process.cwd(), 'papers');
  const requestedArgs = process.argv.slice(2);
  const parser = unified().use(remarkParse).use(remarkGfm);
  const crossReferenceDiagnostics = [];

  try {
    // Check if src/papers exists, if not, nothing to do
    await fs.access(srcPapersDir);
  } catch (err) {
    console.log('No src/papers directory found. Skipping compilation.');
    return;
  }

  async function compileFile(entrySrcPath) {
    const relativePath = path.relative(srcPapersDir, entrySrcPath);
    const targetMdPath = path.join(targetPapersDir, relativePath).replace(/\.mdx$/, '.md');

    await fs.mkdir(path.dirname(targetMdPath), { recursive: true });

    console.log(`Compiling: ${entrySrcPath} -> ${targetMdPath}`);

    const fileContent = await fs.readFile(entrySrcPath, 'utf8');
    const frontMatterMatch = fileContent.match(/^---\n[\s\S]*?\n---\n*/);
    const frontMatter = frontMatterMatch ? frontMatterMatch[0].trimEnd() : '';
    const markdownBody = frontMatterMatch
      ? fileContent.slice(frontMatterMatch[0].length)
      : fileContent;
    const loweredBody = lowerDirectivesToMarkdown(markdownBody);
    const tree = parser.parse(loweredBody);
    const targetIndex = buildSectionTargetIndex({
      headings: collectMarkdownHeadingTargets(tree),
    });
    const markdownRewrites = collectMarkdownCrossReferenceReplacements(tree, {
      diagnosticBase: {
        documentSlug: relativePath.replace(/\.mdx$/, ''),
      },
      targetIndex,
    });
    const linkedBody = applyTextReplacements(loweredBody, markdownRewrites.replacements);
    const header = `<!-- AUTO-GENERATED FROM src/papers/${relativePath}. DO NOT EDIT. -->\n\n`;
    crossReferenceDiagnostics.push(...markdownRewrites.diagnostics);

    const output = frontMatter
      ? `${frontMatter}\n\n${header}${linkedBody}`
      : `${header}${linkedBody}`;
    await fs.writeFile(targetMdPath, syncVisibleLineCount(normalizeCrossReferenceTypography(output)));
  }

  // Recursively process directories
  async function processDirectory(srcPath) {
    const entries = await fs.readdir(srcPath, { withFileTypes: true });

    for (const entry of entries) {
      const entrySrcPath = path.join(srcPath, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(entrySrcPath);
      } else if (entry.name.endsWith('.mdx')) {
        await compileFile(entrySrcPath);
      }
    }
  }

  if (requestedArgs.length > 0) {
    for (const requestedArg of requestedArgs) {
      const resolvedPath = path.resolve(process.cwd(), requestedArg);

      if (!resolvedPath.endsWith('.mdx')) {
        throw new Error(`Expected an .mdx source path, got: ${requestedArg}`);
      }

      if (!isPathInside(resolvedPath, srcPapersDir)) {
        throw new Error(`MDX source must be inside src/papers/: ${requestedArg}`);
      }

      await fs.access(resolvedPath);
      await compileFile(resolvedPath);
    }
  } else {
    await processDirectory(srcPapersDir);
  }

  if (crossReferenceDiagnostics.length > 0) {
    console.log(`[markdown xrefs] collected ${crossReferenceDiagnostics.length} diagnostics`);
  }

  console.log('MDX to Markdown compilation complete!');
}

compileMdxToMarkdown().catch(console.error);
