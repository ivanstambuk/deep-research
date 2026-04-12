import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import { unified } from 'unified';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import MiniSearch from 'minisearch';
import { remarkDirectiveHandler } from './directives.js';
import { SEARCH_INDEX_OPTIONS } from '../src/searchConfig.js';

const srcDir = path.join(process.cwd(), 'src', 'papers');
const outputDir = path.join(process.cwd(), 'src', 'generated', 'documents');
const bodyOutputDir = path.join(process.cwd(), 'public', 'generated', 'document-bodies');
const searchOutputDir = path.join(process.cwd(), 'public', 'generated', 'search', 'documents');
const globalSearchPath = path.join(process.cwd(), 'public', 'generated', 'search', 'global.json');
const manifestPath = path.join(process.cwd(), 'src', 'generated', 'reader-manifest.json');
const SEARCHABLE_TAGS = new Set(['p', 'li', 'td', 'th', 'summary']);
const HEADING_TAGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);

function humanizeFilename(filename) {
  return filename
    .replace(/^DR-\d{4}-/i, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.toUpperCase() === part ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugifyHeading(value, slugger) {
  const plain = value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();

  return {
    text: plain,
    id: slugger.slug(plain),
  };
}

function removeLeadingToc(body) {
  return body.replace(/^## Table of Contents[\s\S]*?(?=^##\s)/m, '').trimStart();
}

function extractSummary(body) {
  const match = body.match(/^(>\s.*(?:\n>\s.*)*)/);

  if (!match) {
    return { summary: null, rest: body };
  }

  const summary = match[1]
    .split('\n')
    .map((line) => line.replace(/^>\s?/, '').trim())
    .join(' ')
    .trim();

  return {
    summary,
    rest: body.slice(match[1].length).trimStart(),
  };
}

function extractOutline(body) {
  const codeFenceStripped = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');
  const slugger = new GithubSlugger();
  const outline = [];

  for (const line of codeFenceStripped.split('\n')) {
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) {
      continue;
    }

    const { text, id } = slugifyHeading(match[2], slugger);
    if (!text) {
      continue;
    }

    outline.push({
      level: match[1].length,
      text,
      id,
    });
  }

  return outline;
}

function buildHeadingPathMap(outline) {
  const stack = [];
  const paths = new Map();

  outline.forEach((entry) => {
    while (stack.length && stack[stack.length - 1].level >= entry.level) {
      stack.pop();
    }

    const pathParts = [...stack.map((item) => item.text), entry.text];
    paths.set(entry.id, pathParts.join(' / '));
    stack.push(entry);
  });

  return paths;
}

function createSearchRecords({ slug, drId, documentTitle, outline, passages }) {
  const headingPathMap = buildHeadingPathMap(outline);
  const records = outline.map((entry) => ({
    id: `${slug}::heading::${entry.id}`,
    slug,
    drId,
    documentTitle,
    headingId: entry.id,
    headingText: entry.text,
    headingPath: headingPathMap.get(entry.id) ?? entry.text,
    text: entry.text,
    type: 'heading',
    targetId: entry.id,
  }));

  passages.forEach((entry) => {
    const headingPath = entry.headingId
      ? headingPathMap.get(entry.headingId) ?? entry.headingText ?? documentTitle
      : entry.headingText ?? documentTitle;

    records.push({
      id: `${slug}::passage::${entry.id}`,
      slug,
      drId,
      documentTitle,
      headingId: entry.headingId ?? null,
      headingText: entry.headingText ?? documentTitle,
      headingPath,
      text: entry.text,
      type: 'passage',
      targetId: entry.id,
    });
  });

  return records;
}

function extractNodeText(node) {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    return node.value ?? '';
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map(extractNodeText).join('');
}

function rehypeSearchPassages() {
  return (tree, file) => {
    const passages = [];
    let currentHeading = null;
    let index = 0;

    function visit(node) {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (node.type === 'element') {
        const tagName = node.tagName;

        if (HEADING_TAGS.has(tagName)) {
          const headingText = extractNodeText(node).replace(/\s+/g, ' ').trim();
          const headingId = typeof node.properties?.id === 'string' ? node.properties.id : null;
          currentHeading = {
            id: headingId,
            text: headingText || 'Document',
          };
        } else if (SEARCHABLE_TAGS.has(tagName)) {
          const text = extractNodeText(node).replace(/\s+/g, ' ').trim();

          if (text.length >= 28) {
            const id = `search-target-${index += 1}`;
            node.properties = {
              ...(node.properties ?? {}),
              'data-search-target-id': id,
            };
            passages.push({
              id,
              text,
              headingId: currentHeading?.id ?? null,
              headingText: currentHeading?.text ?? 'Document',
            });
          }
        }
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    }

    visit(tree);
    file.data.searchPassages = passages;
  };
}

function cleanDocument(raw, fallback) {
  const { data, content } = matter(raw);
  let body = content.replace(/\r\n/g, '\n').trim();

  let title = typeof data.title === 'string' ? data.title.trim() : fallback.guessedTitle;

  const firstHeading = body.match(/^#\s+(.+)$/m);
  if (firstHeading && firstHeading.index === 0) {
    title = firstHeading[1].trim();
    body = body.slice(firstHeading[0].length).trimStart();
  }

  const lines = body.split('\n');
  while (lines[0] !== undefined && !lines[0].trim()) {
    lines.shift();
  }

  let metaLine = null;
  if (lines[0]?.trim().startsWith('**DR-')) {
    metaLine = lines.shift().trim();
  }

  while (lines[0] !== undefined && !lines[0].trim()) {
    lines.shift();
  }

  let summary = null;
  if (lines[0]?.trim().startsWith('>')) {
    const summaryLines = [];

    while (lines[0]?.trim().startsWith('>')) {
      summaryLines.push(lines.shift().replace(/^>\s?/, '').trim());
    }

    summary = summaryLines.join(' ').trim();
  }

  body = lines.join('\n').trimStart();
  body = body.replace(/^---\s*\n+/, '');
  body = removeLeadingToc(body);

  return {
    frontmatter: data,
    title,
    metaLine,
    summary,
    body,
    outline: extractOutline(body),
    lineCount: raw.split('\n').length,
  };
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function build() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(bodyOutputDir, { recursive: true });
  await fs.mkdir(searchOutputDir, { recursive: true });
  await fs.mkdir(path.dirname(globalSearchPath), { recursive: true });

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkDirectiveHandler)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(rehypeSearchPassages)
    .use(rehypeStringify);

  const files = await listFiles(srcDir);
  const manifest = [];
  const globalSearchRecords = [];

  for (const file of files) {
    const filename = path.basename(file, '.mdx');
    const idMatch = filename.match(/(DR-\d{4})/i);
    const drId = idMatch ? idMatch[1].toUpperCase() : filename.toUpperCase();
    const descriptor = {
      guessedTitle: humanizeFilename(filename),
    };

    const raw = await fs.readFile(file, 'utf8');
    const cleaned = cleanDocument(raw, descriptor);
    const vfile = await processor.process(cleaned.body);
    const html = String(vfile);
    const searchRecords = createSearchRecords({
      slug: filename,
      drId,
      documentTitle: cleaned.title,
      outline: cleaned.outline,
      passages: vfile.data.searchPassages ?? [],
    });
    const documentSearchIndex = new MiniSearch(SEARCH_INDEX_OPTIONS);
    documentSearchIndex.addAll(searchRecords);
    const shellJson = {
      drId,
      slug: filename,
      title: cleaned.title,
      metaLine: cleaned.metaLine,
      summary: cleaned.summary,
      outline: cleaned.outline,
      lineCount: cleaned.lineCount,
      status: cleaned.frontmatter.status ?? 'draft',
      dateUpdated: cleaned.frontmatter.date_updated ?? null,
      authors: cleaned.frontmatter.authors ?? [],
    };
    const bodyJson = {
      slug: filename,
      html,
    };
    const searchJson = {
      slug: filename,
      index: documentSearchIndex.toJSON(),
      count: searchRecords.length,
    };

    await fs.writeFile(
      path.join(outputDir, `${filename}.json`),
      `${JSON.stringify(shellJson, null, 2)}\n`
    );
    await fs.writeFile(
      path.join(bodyOutputDir, `${filename}.json`),
      `${JSON.stringify(bodyJson, null, 2)}\n`
    );
    await fs.writeFile(
      path.join(searchOutputDir, `${filename}.json`),
      `${JSON.stringify(searchJson, null, 2)}\n`
    );

    globalSearchRecords.push(...searchRecords);

    manifest.push({
      slug: filename,
      drId,
      title: cleaned.title,
      summary: cleaned.summary,
      status: cleaned.frontmatter.status ?? 'draft',
      dateUpdated: cleaned.frontmatter.date_updated ?? null,
      authors: cleaned.frontmatter.authors ?? [],
      lineCount: cleaned.lineCount,
      order: Number.parseInt(drId.replace(/\D/g, ''), 10) || 9999,
    });
  }

  manifest.sort((left, right) => left.order - right.order);
  const globalSearchIndex = new MiniSearch(SEARCH_INDEX_OPTIONS);
  globalSearchIndex.addAll(globalSearchRecords);
  await fs.writeFile(
    globalSearchPath,
    `${JSON.stringify({
      index: globalSearchIndex.toJSON(),
      count: globalSearchRecords.length,
    }, null, 2)}\n`,
  );
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Built reader assets for ${manifest.length} documents.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
