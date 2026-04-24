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
import {
  applyTextReplacements,
  buildLabelTargetIndex,
  buildSectionTargetIndex,
  collectLikelyFalsePositiveExternalSkips,
  collectMarkdownLabelTargets,
  normalizeWhitespace,
  rewriteHastCrossReferences,
  slugifyHeadingText,
} from './cross-reference-links.js';
import { remarkDirectiveHandler } from './directives.js';
import { rehypeDecodeCodeEntities } from './rehype-code-entities.js';

const srcDir = path.join(process.cwd(), 'src', 'papers');
const generatedRootDir = path.join(process.cwd(), 'src', 'generated');
const outputDir = path.join(process.cwd(), 'src', 'generated', 'documents');
const chaptersRootDir = path.join(process.cwd(), 'src', 'generated', 'chapters');
const manifestPath = path.join(process.cwd(), 'src', 'generated', 'reader-manifest.json');
const obsoleteGeneratedDirs = [
  path.join(generatedRootDir, 'search'),
  path.join(generatedRootDir, 'sections'),
  path.join(generatedRootDir, 'document-bodies'),
  path.join(generatedRootDir, 'document-search'),
];

const HEADING_TAGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);
const PRIMARY_SECTION_TAG = 'h2';
const SECONDARY_SECTION_TAG = 'h3';
const OVERSIZED_SECTION_BYTES = 34_000;
const READER_LINK_BASE_URL = 'https://reader.local/';

const htmlCompiler = unified().use(rehypeStringify);

function logLikelyFalsePositiveExternalSkipReport(prefix, diagnostics) {
  if (diagnostics.length === 0) {
    return;
  }

  console.log(`[${prefix}] likely false-positive external skips: ${diagnostics.length}`);
  diagnostics.slice(0, 12).forEach((diagnostic) => {
    const targetLabel = diagnostic.headingText
      ? `${diagnostic.tokenText} -> ${diagnostic.headingText}`
      : diagnostic.tokenText;
    console.log(`- ${diagnostic.documentSlug}: ${targetLabel}`);
    console.log(`  ${diagnostic.snippet}`);
  });

  if (diagnostics.length > 12) {
    console.log(`- ... ${diagnostics.length - 12} more`);
  }
}

function stringifyHtml(tree) {
  return String(htmlCompiler.stringify(tree));
}

function humanizeFilename(filename) {
  return filename
    .replace(/^DR-\d{4}-/i, '')
    .split('-')
    .filter(Boolean)
    .map((part) => (part.toUpperCase() === part ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
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

    const { text, id } = slugifyHeadingText(match[2], slugger);
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

function wrapTablesForHorizontalScroll(tree) {
  function visit(parent) {
    if (!parent || typeof parent !== 'object' || !Array.isArray(parent.children)) {
      return;
    }

    const parentIsTableScroll = parent.type === 'element' && nodeClassList(parent).includes('table-scroll');

    parent.children = parent.children.map((child) => {
      if (!child || typeof child !== 'object') {
        return child;
      }

      if (isElementTag(child, 'table') && !parentIsTableScroll) {
        return {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['table-scroll'],
          },
          children: [child],
        };
      }

      visit(child);
      return child;
    });
  }

  visit(tree);
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

  const text = normalizeWhitespace(extractNodeText(node));
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
    textLength: 0,
  };

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

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return stats;
}

function createSectionRecord(children, fallbackId, primaryHeadingId = null) {
  const tree = createRoot(cloneNode(children));
  const headings = collectSectionStats(tree).headings;
  const resolvedPrimaryHeadingId = primaryHeadingId ?? headings[0]?.id ?? null;
  const sectionId = resolvedPrimaryHeadingId ?? fallbackId;

  return finalizeSectionRecord({
    tree,
    sectionId,
    primaryHeadingId: resolvedPrimaryHeadingId,
  });
}

function finalizeSectionRecord(section) {
  const html = stringifyHtml(section.tree);
  const htmlBytes = Buffer.byteLength(html, 'utf8');
  const stats = collectSectionStats(section.tree);
  const headings = stats.headings;
  const resolvedPrimaryHeadingId = section.primaryHeadingId ?? headings[0]?.id ?? null;

  return {
    ...section,
    sectionId: resolvedPrimaryHeadingId ?? section.sectionId,
    primaryHeadingId: resolvedPrimaryHeadingId,
    headingIds: headings.map((item) => item.id),
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

function createSectionsFromTree(tree, options = {}) {
  const allowSecondarySplit = options.allowSecondarySplit !== false;
  const groups = splitChildrenByHeading(tree.children ?? [], PRIMARY_SECTION_TAG);
  const sections = [];

  groups.forEach((groupChildren, index) => {
    const initialRecord = createSectionRecord(groupChildren, `section-${String(index).padStart(3, '0')}`);

    if (allowSecondarySplit && initialRecord.htmlBytes > OVERSIZED_SECTION_BYTES) {
      const oversizedSplit = splitOversizedSection(groupChildren, initialRecord.sectionId);
      sections.push(...oversizedSplit);
    } else {
      sections.push(initialRecord);
    }
  });

  return sections;
}

function buildReaderCrossReferenceIndex({ sections, slug }) {
  return buildSectionTargetIndex({
    headings: sections.flatMap((section) => (
      section.stats.headings.map((heading) => ({
        chapterId: section.sectionId,
        headingId: heading.id,
        slug,
        text: heading.text,
      }))
    )),
  });
}

function collectElementIds(tree) {
  const ids = new Set();

  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'element' && typeof node.properties?.id === 'string') {
      ids.add(node.properties.id);
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return ids;
}

function shouldOpenExternalLinkInNewTab(href) {
  if (typeof href !== 'string') {
    return false;
  }

  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith('#')) {
    return false;
  }

  try {
    const resolvedUrl = new URL(trimmedHref, READER_LINK_BASE_URL);
    return (
      (resolvedUrl.protocol === 'http:' || resolvedUrl.protocol === 'https:') &&
      resolvedUrl.origin !== new URL(READER_LINK_BASE_URL).origin
    );
  } catch {
    return false;
  }
}

function appendExternalLinkTargets(tree) {
  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'element' && node.tagName === 'a') {
      const href = typeof node.properties?.href === 'string' ? node.properties.href : '';
      if (shouldOpenExternalLinkInNewTab(href)) {
        const existingRel = Array.isArray(node.properties?.rel)
          ? node.properties.rel
          : typeof node.properties?.rel === 'string'
            ? node.properties.rel.split(/\s+/).filter(Boolean)
            : [];
        const relTokens = new Set(existingRel);
        relTokens.add('noopener');
        relTokens.add('noreferrer');

        node.properties = {
          ...node.properties,
          target: '_blank',
          rel: [...relTokens],
        };
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
}

function buildReaderLabelTargetIndex({ sections, slug, targets }) {
  const chapterByAnchorId = new Map();

  sections.forEach((section) => {
    collectElementIds(section.tree).forEach((anchorId) => {
      if (!chapterByAnchorId.has(anchorId)) {
        chapterByAnchorId.set(anchorId, section.sectionId);
      }
    });
  });

  return buildLabelTargetIndex({
    targets: targets.map((target) => ({
      ...target,
      slug,
      chapterId: chapterByAnchorId.get(target.headingId) ?? null,
    })),
  });
}

function createChapterPayloads({ slug, drId, documentTitle, sections, outline, docVersion }) {
  const headingPathMap = buildHeadingPathMap(outline);

  return sections.map((section, index) => {
    const previous = sections[index - 1] ?? null;
    const next = sections[index + 1] ?? null;
    const title = section.stats.headings[0]?.text ?? documentTitle;

    return {
      slug,
      drId,
      documentTitle,
      buildId: docVersion,
      chapterId: section.sectionId,
      title,
      order: index,
      html: section.html,
      primaryHeadingId: section.primaryHeadingId,
      headingIds: section.headingIds,
      headings: section.stats.headings.map((heading) => ({
        id: heading.id,
        text: heading.text,
        level: Number.parseInt(String(heading.tagName ?? '').replace(/\D/g, ''), 10) || null,
        path: headingPathMap.get(heading.id) ?? heading.text,
      })),
      prevChapterId: previous?.sectionId ?? null,
      nextChapterId: next?.sectionId ?? null,
    };
  });
}

function buildShellChapterEntries({ chapters, outline, docVersion, slug }) {
  const outlineLevelById = new Map(outline.map((entry) => [entry.id, entry.level]));
  const shellEntries = chapters.map((chapter) => ({
    chapterId: chapter.chapterId,
    title: chapter.title,
    order: chapter.order,
    primaryHeadingId: chapter.primaryHeadingId,
    headingIds: chapter.headingIds,
    prevChapterId: chapter.prevChapterId,
    nextChapterId: chapter.nextChapterId,
    outlineLevel: outlineLevelById.get(chapter.primaryHeadingId) ?? 3,
    groupParentChapterId: null,
    groupChildren: [],
    modulePath: `./generated/chapters/${slug}/${docVersion}/${chapter.chapterId}.json`,
  }));

  let activeGroupEntry = null;

  shellEntries.forEach((entry) => {
    if (entry.outlineLevel <= 2) {
      activeGroupEntry = entry.outlineLevel === 2 ? entry : null;
      return;
    }

    if (entry.outlineLevel === 3 && activeGroupEntry) {
      activeGroupEntry.groupChildren.push({
        chapterId: entry.chapterId,
        title: entry.title,
        order: entry.order,
        primaryHeadingId: entry.primaryHeadingId,
      });
      entry.groupParentChapterId = activeGroupEntry.chapterId;
    }
  });

  return shellEntries.map((entry) => ({
    ...entry,
    groupChildren: entry.groupChildren.length >= 2 ? entry.groupChildren : [],
  }));
}

function assertTopology({ sections, outline, slug }) {
  const seenHeadings = new Map();
  const emittedHeadingIds = new Set();

  sections.forEach((section) => {
    section.headingIds.forEach((headingId) => {
      if (seenHeadings.has(headingId)) {
        throw new Error(`${slug}: heading ${headingId} belongs to multiple sections`);
      }
      seenHeadings.set(headingId, section.sectionId);
      emittedHeadingIds.add(headingId);
    });

    if (section.stats.mermaidBlocks > 0 && !section.html.includes('language-mermaid')) {
      throw new Error(`${slug}: Mermaid section ${section.sectionId} is missing Mermaid markup in emitted HTML`);
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
  await ensureCleanDir(chaptersRootDir);
  await Promise.all(obsoleteGeneratedDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkDirectiveHandler)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeDecodeCodeEntities)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeSlug)
    .use(rehypeKatex);
  const mdastParser = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective);

  const files = await listFiles(srcDir);
  const processedDocuments = [];
  const crossReferenceDiagnostics = [];
  const likelyFalsePositiveExternalSkips = [];

  for (const file of files) {
    const filename = path.basename(file, '.mdx');
    const idMatch = filename.match(/(DR-\d{4})/i);
    const drId = idMatch ? idMatch[1].toUpperCase() : filename.toUpperCase();
    const descriptor = {
      guessedTitle: humanizeFilename(filename),
    };

    const raw = await fs.readFile(file, 'utf8');
    const cleaned = cleanDocument(raw, descriptor);
    const markdownTree = mdastParser.parse(cleaned.body);
    const labelTargets = collectMarkdownLabelTargets(markdownTree, {
      documentSlug: filename,
    });
    const bodyWithLabelAnchors = applyTextReplacements(cleaned.body, labelTargets.anchorReplacements);
    const tree = await processor.run(processor.parse(bodyWithLabelAnchors));
    wrapTablesForHorizontalScroll(tree);
    let sections = createSectionsFromTree(tree, {
      allowSecondarySplit: cleaned.frontmatter.reader_allow_h3_chapter_split !== false,
    });
    const crossReferenceIndex = buildReaderCrossReferenceIndex({
      sections,
      slug: filename,
    });
    const labelTargetIndex = buildReaderLabelTargetIndex({
      sections,
      slug: filename,
      targets: labelTargets.targets,
    });
    crossReferenceDiagnostics.push(...labelTargets.diagnostics);

    sections = sections.map((section) => {
      const sectionDiagnostics = rewriteHastCrossReferences(section.tree, {
        diagnosticBase: {
          documentSlug: filename,
        },
        slug: filename,
        targetIndex: crossReferenceIndex,
        labelTargetIndex,
      });
      crossReferenceDiagnostics.push(...sectionDiagnostics);
      likelyFalsePositiveExternalSkips.push(...collectLikelyFalsePositiveExternalSkips({
        diagnostics: sectionDiagnostics,
        targetIndex: crossReferenceIndex,
      }));
      appendExternalLinkTargets(section.tree);
      return finalizeSectionRecord(section);
    });

    const docVersion = buildDocVersion(`${filename}:${raw}`);
    const chapterDir = path.join(chaptersRootDir, filename, docVersion);

    await fs.mkdir(chapterDir, { recursive: true });
    const chapterPayloads = createChapterPayloads({
      slug: filename,
      drId,
      documentTitle: cleaned.title,
      sections,
      outline: cleaned.outline,
      docVersion,
    });
    const shellChapters = buildShellChapterEntries({
      chapters: chapterPayloads,
      outline: cleaned.outline,
      docVersion,
      slug: filename,
    });

    assertTopology({
      sections,
      outline: cleaned.outline,
      slug: filename,
    });

    for (const chapter of chapterPayloads) {
      await fs.writeFile(
        path.join(chapterDir, `${chapter.chapterId}.json`),
        `${JSON.stringify(chapter, null, 2)}\n`,
      );
    }

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
      firstChapterId: chapterPayloads[0]?.chapterId ?? null,
      chapterCount: chapterPayloads.length,
      chapters: shellChapters,
    };

    await fs.writeFile(
      path.join(outputDir, `${filename}.json`),
      `${JSON.stringify(shellJson, null, 2)}\n`,
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
      firstChapterId: chapterPayloads[0]?.chapterId ?? null,
      chapterCount: chapterPayloads.length,
    });
  }

  processedDocuments.sort((left, right) => left.order - right.order);
  const globalBuildId = buildDocVersion(JSON.stringify(processedDocuments.map((entry) => `${entry.slug}:${entry.buildId}`)));

  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({
      buildId: globalBuildId,
      crossReferenceDiagnosticsCount: crossReferenceDiagnostics.length,
      documents: processedDocuments,
    }, null, 2)}\n`,
  );

  if (crossReferenceDiagnostics.length > 0) {
    console.log(`[reader xrefs] collected ${crossReferenceDiagnostics.length} diagnostics`);
  }
  logLikelyFalsePositiveExternalSkipReport('reader xrefs', likelyFalsePositiveExternalSkips);

  console.log(`Built chapter reader assets for ${processedDocuments.length} documents.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
