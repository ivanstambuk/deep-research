import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

const srcDir = path.join(process.cwd(), 'src', 'papers');
const outputDir = path.join(process.cwd(), 'src', 'generated', 'documents');
const manifestPath = path.join(process.cwd(), 'src', 'generated', 'reader-manifest.json');

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

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(rehypeStringify);

  const files = await listFiles(srcDir);
  const manifest = [];

  for (const file of files) {
    const filename = path.basename(file, '.mdx');
    const idMatch = filename.match(/(DR-\d{4})/i);
    const drId = idMatch ? idMatch[1].toUpperCase() : filename.toUpperCase();
    const descriptor = {
      guessedTitle: humanizeFilename(filename),
    };

    const raw = await fs.readFile(file, 'utf8');
    const cleaned = cleanDocument(raw, descriptor);
    const html = String(await processor.process(cleaned.body));
    const docJson = {
      ...cleaned,
      drId,
      slug: filename,
      status: cleaned.frontmatter.status ?? 'draft',
      dateUpdated: cleaned.frontmatter.date_updated ?? null,
      authors: cleaned.frontmatter.authors ?? [],
      html,
    };

    delete docJson.body;
    delete docJson.frontmatter;

    await fs.writeFile(
      path.join(outputDir, `${filename}.json`),
      `${JSON.stringify(docJson, null, 2)}\n`
    );

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
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Built reader assets for ${manifest.length} documents.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
