import crypto from 'crypto';
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
const sectionsRootDir = path.join(process.cwd(), 'public', 'generated', 'sections');
const searchRootDir = path.join(process.cwd(), 'public', 'generated', 'search');
const searchOutputDir = path.join(searchRootDir, 'documents');
const legacyBodyDir = path.join(process.cwd(), 'public', 'generated', 'document-bodies');
const manifestPath = path.join(process.cwd(), 'src', 'generated', 'reader-manifest.json');

const SEARCHABLE_TAGS = new Set(['p', 'li', 'td', 'th', 'summary']);
const HEADING_TAGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);
const PRIMARY_SECTION_TAG = 'h2';
const SECONDARY_SECTION_TAG = 'h3';
const CHUNK_TARGET_BYTES = 42_000;
const CHUNK_MAX_SECTIONS = 4;
const INLINE_TARGET_HEIGHT = 1_650;
const INLINE_MAX_BYTES = 40_000;
const INLINE_MAX_SECTIONS = 4;
const OVERSIZED_SECTION_BYTES = 34_000;
const SECTION_PLACEHOLDER_MIN_HEIGHT = 220;

const htmlCompiler = unified().use(rehypeStringify);

function stringifyHtml(tree) {
  return String(htmlCompiler.stringify(tree));
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function humanizeFilename(filename) {
  return filename
    .replace(/^DR-\d{4}-/i, '')
    .split('-')
    .filter(Boolean)
    .map((part) => (part.toUpperCase() === part ? part : part.charAt(0).toUpperCase() + part.slice(1)))
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

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isElementTag(node, tagName) {
  return node?.type === 'element' && node.tagName === tagName;
}

function nodeClassList(node) {
  const classes = node?.properties?.className;
  if (Array.isArray(classes)) {
    return classes;
  }

  if (typeof classes === 'string') {
    return classes.split(/\s+/).filter(Boolean);
  }

  return [];
}

function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

function createRoot(children) {
  return {
    type: 'root',
    children,
  };
}

function rehypeTagSearchTargets() {
  return (tree) => {
    let index = 0;

    function visit(node) {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (node.type === 'element' && SEARCHABLE_TAGS.has(node.tagName)) {
        const text = normalizeText(extractNodeText(node));
        if (text.length >= 28) {
          const id = `search-target-${(index += 1)}`;
          node.properties = {
            ...(node.properties ?? {}),
            'data-search-target-id': id,
          };
        }
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    }

    visit(tree);
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

function extractHeadingInfo(node) {
  if (!node || node.type !== 'element' || !HEADING_TAGS.has(node.tagName)) {
    return null;
  }

  const text = normalizeText(extractNodeText(node));
  const id = typeof node.properties?.id === 'string' ? node.properties.id : null;
  return text && id ? { id, text, tagName: node.tagName } : null;
}

function splitChildrenByHeading(children, tagName) {
  const groups = [];
  let currentChildren = [];

  children.forEach((child) => {
    if (isElementTag(child, tagName)) {
      if (currentChildren.length) {
        groups.push(currentChildren);
      }
      currentChildren = [child];
    } else {
      currentChildren.push(child);
    }
  });

  if (currentChildren.length) {
    groups.push(currentChildren);
  }

  return groups;
}

function collectSectionStats(tree) {
  const stats = {
    paragraphs: 0,
    listItems: 0,
    tables: 0,
    codeBlocks: 0,
    mermaidBlocks: 0,
    headings: [],
    passages: [],
    textLength: 0,
  };
  let currentHeading = null;

  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'text') {
      stats.textLength += (node.value ?? '').length;
      return;
    }

    if (node.type !== 'element') {
      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
      return;
    }

    const heading = extractHeadingInfo(node);
    if (heading) {
      currentHeading = heading;
      stats.headings.push(heading);
    }

    if (node.tagName === 'p') {
      stats.paragraphs += 1;
    } else if (node.tagName === 'li') {
      stats.listItems += 1;
    } else if (node.tagName === 'table') {
      stats.tables += 1;
    } else if (node.tagName === 'pre') {
      stats.codeBlocks += 1;
    } else if (node.tagName === 'code') {
      const classes = nodeClassList(node);
      if (classes.includes('language-mermaid')) {
        stats.mermaidBlocks += 1;
      }
    }

    if (SEARCHABLE_TAGS.has(node.tagName) && node.properties?.['data-search-target-id']) {
      const text = normalizeText(extractNodeText(node));
      if (text) {
        stats.passages.push({
          id: node.properties['data-search-target-id'],
          text,
          headingId: currentHeading?.id ?? null,
          headingText: currentHeading?.text ?? 'Document',
        });
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return stats;
}

function estimateSectionHeight({ htmlBytes, stats }) {
  const linesFromText = Math.ceil(stats.textLength / 110);
  const base =
    110 +
    linesFromText * 18 +
    stats.paragraphs * 14 +
    stats.listItems * 10 +
    stats.codeBlocks * 170 +
    stats.tables * 240 +
    stats.mermaidBlocks * 280 +
    stats.headings.length * 52;

  return Math.max(
    SECTION_PLACEHOLDER_MIN_HEIGHT,
    Math.min(2800, Math.round(base + htmlBytes / 14)),
  );
}

function createSectionRecord(children, fallbackId, primaryHeadingId = null) {
  const tree = createRoot(cloneNode(children));
  const html = stringifyHtml(tree);
  const htmlBytes = byteLength(html);
  const stats = collectSectionStats(tree);
  const headings = stats.headings;
  const resolvedPrimaryHeadingId = primaryHeadingId ?? headings[0]?.id ?? null;
  const sectionId = resolvedPrimaryHeadingId ?? fallbackId;

  return {
    sectionId,
    primaryHeadingId: resolvedPrimaryHeadingId,
    headingIds: headings.map((item) => item.id),
    containsMermaid: stats.mermaidBlocks > 0,
    containsKatex: html.includes('katex'),
    estimatedHeight: estimateSectionHeight({ htmlBytes, stats }),
    html,
    htmlBytes,
    stats,
  };
}

function splitOversizedSection(children, fallbackBaseId) {
  const groups = splitChildrenByHeading(children, SECONDARY_SECTION_TAG);
  if (groups.length <= 1) {
    return [createSectionRecord(children, `${fallbackBaseId}-000`)];
  }

  return groups.map((groupChildren, index) => {
    const heading = extractHeadingInfo(groupChildren[0]);
    const fallbackId = `${fallbackBaseId}-${String(index).padStart(3, '0')}`;
    return createSectionRecord(groupChildren, fallbackId, heading?.id ?? null);
  });
}

function createSectionsFromTree(tree) {
  const groups = splitChildrenByHeading(tree.children ?? [], PRIMARY_SECTION_TAG);
  const sections = [];

  groups.forEach((groupChildren, index) => {
    const initialRecord = createSectionRecord(groupChildren, `section-${String(index).padStart(3, '0')}`);

    if (initialRecord.htmlBytes > OVERSIZED_SECTION_BYTES) {
      const oversizedSplit = splitOversizedSection(groupChildren, initialRecord.sectionId);
      sections.push(...oversizedSplit);
    } else {
      sections.push(initialRecord);
    }
  });

  return sections.map((section, index) => ({
    ...section,
    renderOrder: index,
  }));
}

function chooseInlineSections(sections) {
  const inline = [];
  let totalHeight = 0;
  let totalBytes = 0;

  for (const section of sections) {
    if (inline.length >= INLINE_MAX_SECTIONS) {
      break;
    }

    if (inline.length > 0 && totalHeight >= INLINE_TARGET_HEIGHT) {
      break;
    }

    if (inline.length > 0 && totalBytes + section.htmlBytes > INLINE_MAX_BYTES) {
      break;
    }

    inline.push(section.sectionId);
    totalHeight += section.estimatedHeight;
    totalBytes += section.htmlBytes;
  }

  if (!inline.length && sections[0]) {
    inline.push(sections[0].sectionId);
  }

  return new Set(inline);
}

function planChunks(sections, inlineSectionIds) {
  const deferredSections = sections.filter((section) => !inlineSectionIds.has(section.sectionId));
  const chunks = [];
  let current = [];
  let currentBytes = 0;

  const flush = () => {
    if (!current.length) {
      return;
    }

    chunks.push(current);
    current = [];
    currentBytes = 0;
  };

  deferredSections.forEach((section) => {
    const isHeavy = section.containsMermaid || section.stats.tables > 0 || section.htmlBytes > CHUNK_TARGET_BYTES * 0.66;
    const shouldStartNewChunk =
      current.length > 0 && (
        current.length >= CHUNK_MAX_SECTIONS ||
        currentBytes + section.htmlBytes > CHUNK_TARGET_BYTES ||
        isHeavy
      );

    if (shouldStartNewChunk) {
      flush();
    }

    current.push(section);
    currentBytes += section.htmlBytes;

    if (isHeavy) {
      flush();
    }
  });

  flush();

  return chunks.map((sectionsInChunk, index) => ({
    chunkId: `chunk-${String(index).padStart(3, '0')}`,
    sections: sectionsInChunk,
  }));
}

function createChunkHtml(chunk) {
  return chunk.sections
    .map((section) => `<section data-section-id="${section.sectionId}" data-chunk-id="${chunk.chunkId}" class="doc-section-fragment">\n${section.html}\n</section>`)
    .join('\n');
}

function createSearchRecords({ slug, drId, documentTitle, outline, sections }) {
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
    sectionId: sections.find((section) => section.headingIds.includes(entry.id))?.sectionId ?? null,
    chunkId: sections.find((section) => section.headingIds.includes(entry.id))?.chunkId ?? 'shell',
  }));

  sections.forEach((section) => {
    section.stats.passages.forEach((entry) => {
      const headingPath = entry.headingId
        ? headingPathMap.get(entry.headingId) ?? entry.headingText ?? documentTitle
        : entry.headingText ?? documentTitle;

      records.push({
        id: `${slug}::passage::${entry.id}`,
        slug,
        drId,
        documentTitle,
        headingId: entry.headingId ?? section.primaryHeadingId ?? null,
        headingText: entry.headingText ?? section.stats.headings[0]?.text ?? documentTitle,
        headingPath,
        text: entry.text,
        type: 'passage',
        targetId: entry.id,
        sectionId: section.sectionId,
        chunkId: section.chunkId,
      });
    });
  });

  return records;
}

function assertTopology({ sections, inlineSectionIds, chunks, searchRecords, slug }) {
  const sectionIds = new Set(sections.map((section) => section.sectionId));
  const seenHeadings = new Map();

  sections.forEach((section) => {
    section.headingIds.forEach((headingId) => {
      if (seenHeadings.has(headingId)) {
        throw new Error(`${slug}: heading ${headingId} belongs to multiple sections`);
      }
      seenHeadings.set(headingId, section.sectionId);
    });
  });

  const deferredSectionIds = new Set(chunks.flatMap((chunk) => chunk.sections.map((section) => section.sectionId)));

  sections.forEach((section) => {
    const isInline = inlineSectionIds.has(section.sectionId);
    const isDeferred = deferredSectionIds.has(section.sectionId);

    if (isInline === isDeferred) {
      throw new Error(`${slug}: section ${section.sectionId} must belong to exactly one transport owner`);
    }
  });

  chunks.forEach((chunk) => {
    const orders = chunk.sections.map((section) => section.renderOrder);
    const expected = Array.from({ length: orders.length }, (_, index) => orders[0] + index);
    if (orders.some((value, index) => value !== expected[index])) {
      throw new Error(`${slug}: chunk ${chunk.chunkId} is not contiguous in render order`);
    }
  });

  searchRecords.forEach((record) => {
    if (record.sectionId && !sectionIds.has(record.sectionId)) {
      throw new Error(`${slug}: search record ${record.id} references missing section ${record.sectionId}`);
    }
  });
}

function buildDocVersion(seed) {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 10);
}

async function ensureCleanDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function build() {
  await fs.mkdir(outputDir, { recursive: true });
  await ensureCleanDir(sectionsRootDir);
  await ensureCleanDir(searchRootDir);
  await ensureCleanDir(searchOutputDir);
  await fs.rm(legacyBodyDir, { recursive: true, force: true });

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
    .use(rehypeTagSearchTargets);

  const files = await listFiles(srcDir);
  const processedDocuments = [];
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
    const tree = await processor.run(processor.parse(cleaned.body));
    const sections = createSectionsFromTree(tree);
    const inlineSectionIds = chooseInlineSections(sections);
    const chunks = planChunks(sections, inlineSectionIds);
    const docVersion = buildDocVersion(`${filename}:${raw}`);
    const sectionDir = path.join(sectionsRootDir, filename, docVersion);

    await fs.mkdir(sectionDir, { recursive: true });

    const chunkManifest = chunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      url: `/generated/sections/${filename}/${docVersion}/${chunk.chunkId}.frag`,
      sectionIds: chunk.sections.map((section) => section.sectionId),
    }));

    sections.forEach((section) => {
      const chunk = chunks.find((entry) => entry.sections.some((item) => item.sectionId === section.sectionId));
      section.chunkId = inlineSectionIds.has(section.sectionId) ? 'shell' : chunk?.chunkId ?? null;
      section.chunkUrl = inlineSectionIds.has(section.sectionId)
        ? null
        : `/generated/sections/${filename}/${docVersion}/${chunk.chunkId}.frag`;
    });

    const searchRecords = createSearchRecords({
      slug: filename,
      drId,
      documentTitle: cleaned.title,
      outline: cleaned.outline,
      sections,
    });

    assertTopology({
      sections,
      inlineSectionIds,
      chunks,
      searchRecords,
      slug: filename,
    });

    for (const chunk of chunks) {
      await fs.writeFile(
        path.join(sectionDir, `${chunk.chunkId}.frag`),
        `${createChunkHtml(chunk)}\n`,
      );
    }

    const documentSearchIndex = new MiniSearch(SEARCH_INDEX_OPTIONS);
    documentSearchIndex.addAll(searchRecords);

    const shellJson = {
      drId,
      slug: filename,
      buildId: docVersion,
      title: cleaned.title,
      metaLine: cleaned.metaLine,
      summary: cleaned.summary,
      outline: cleaned.outline,
      lineCount: cleaned.lineCount,
      status: cleaned.frontmatter.status ?? 'draft',
      dateUpdated: cleaned.frontmatter.date_updated ?? null,
      authors: cleaned.frontmatter.authors ?? [],
      inlineSectionIds: Array.from(inlineSectionIds),
      inlineSections: sections
        .filter((section) => inlineSectionIds.has(section.sectionId))
        .map((section) => ({
          sectionId: section.sectionId,
          html: section.html,
        })),
      renderManifest: {
        chunks: chunkManifest,
        sections: sections.map((section) => ({
          sectionId: section.sectionId,
          renderOrder: section.renderOrder,
          primaryHeadingId: section.primaryHeadingId,
          headingIds: section.headingIds,
          estimatedHeight: section.estimatedHeight,
          containsMermaid: section.containsMermaid,
          containsKatex: section.containsKatex,
          chunkId: section.chunkId,
          chunkUrl: section.chunkUrl,
          isInline: inlineSectionIds.has(section.sectionId),
        })),
      },
      searchUrl: `/generated/search/documents/${filename}-${docVersion}.json`,
    };

    const searchJson = {
      buildId: docVersion,
      index: documentSearchIndex.toJSON(),
      count: searchRecords.length,
    };

    await fs.writeFile(
      path.join(outputDir, `${filename}.json`),
      `${JSON.stringify(shellJson, null, 2)}\n`,
    );
    await fs.writeFile(
      path.join(searchOutputDir, `${filename}-${docVersion}.json`),
      `${JSON.stringify(searchJson, null, 2)}\n`,
    );

    processedDocuments.push({
      slug: filename,
      drId,
      title: cleaned.title,
      summary: cleaned.summary,
      status: cleaned.frontmatter.status ?? 'draft',
      dateUpdated: cleaned.frontmatter.date_updated ?? null,
      authors: cleaned.frontmatter.authors ?? [],
      lineCount: cleaned.lineCount,
      order: Number.parseInt(drId.replace(/\D/g, ''), 10) || 9999,
      buildId: docVersion,
      searchUrl: `/generated/search/documents/${filename}-${docVersion}.json`,
    });

    globalSearchRecords.push(...searchRecords);
  }

  processedDocuments.sort((left, right) => left.order - right.order);
  const globalBuildId = buildDocVersion(JSON.stringify(processedDocuments.map((entry) => `${entry.slug}:${entry.buildId}`)));
  const globalSearchIndex = new MiniSearch(SEARCH_INDEX_OPTIONS);
  globalSearchIndex.addAll(globalSearchRecords);

  await fs.writeFile(
    path.join(searchRootDir, `global-${globalBuildId}.json`),
    `${JSON.stringify({
      buildId: globalBuildId,
      index: globalSearchIndex.toJSON(),
      count: globalSearchRecords.length,
    }, null, 2)}\n`,
  );

  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({
      buildId: globalBuildId,
      globalSearchUrl: `/generated/search/global-${globalBuildId}.json`,
      documents: processedDocuments,
    }, null, 2)}\n`,
  );

  console.log(`Built progressive reader assets for ${processedDocuments.length} documents.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
