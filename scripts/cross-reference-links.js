import GithubSlugger from 'github-slugger';

const LOOKBACK_LIMIT = 96;
const XREF_TOKEN_RE = /§\d+(?:\.\d+)*/g;
const HAST_ELIGIBLE_CONTAINER_TAGS = new Set(['blockquote', 'li', 'p', 'summary', 'td', 'th']);
const HAST_FORBIDDEN_TAGS = new Set(['a', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'script', 'style']);
const MDAST_ELIGIBLE_CONTAINER_TYPES = new Set(['blockquote', 'listItem', 'paragraph', 'tableCell']);
const MDAST_FORBIDDEN_TYPES = new Set([
  'code',
  'definition',
  'footnoteDefinition',
  'heading',
  'html',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
  'yaml',
]);

const EXTERNAL_CITATION_PATTERNS = [
  /\bRFC\s*\d[\w.-]*(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bNIST(?:\s+SP)?\s+\d[\w.-]*(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bISO\s+\d[\w.-]*(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bETSI\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bCIR\s+\d{4}\/\d+(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bARF\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bTS\d+\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bWebAuthn(?:\s+L\d+)?\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\b(?:spec|specification|draft)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\b(?:Article|Art\.)\s+\d[\w.-]*(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bAnnex\s+[A-Z0-9IVXLC]+(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\b(?:Directive|Regulation)(?:\s+\(?EU\)?)?(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bHIPAA\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bPCI\s+DSS\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bOWASP\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\b(?:OID4VP|OID4VCI|OAuth|OpenID|FAPI)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOpenID4VP\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOpenID\s+Connect\s+Core\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bPID\s+Rulebook\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bSD-JWT\s+VC\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bCSC\s+API\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\b(?:SAMLCore|SAMLProf)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOASIS\s+SAML(?:\s+V\d+(?:\.\d+)*)?(?:\s+Core)?\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bWebAuthn(?:\s+Level\s+\d+)?\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bFielding\s+\d{4},?\s*$/i,
  /\bFielding\s+\d{4}\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\b(?:SOX|Sarbanes-Oxley)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bCUBI\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bW3C\s+DBSC\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bTopic\s+\d[\w.-]*(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
];

function stripMarkdownFormatting(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function slugifyHeadingText(value, slugger = new GithubSlugger()) {
  const plain = stripMarkdownFormatting(value);

  return {
    text: plain,
    id: slugger.slug(plain),
  };
}

export function extractHeadingSectionNumber(value) {
  const match = normalizeWhitespace(value).match(/^§?\s*(\d+(?:\.\d+)*)(?:\.)?(?=\s|$)/);
  return match ? match[1] : null;
}

export function buildReaderHref({ slug, chapterId, headingId }) {
  if (!slug || !chapterId || !headingId) {
    return null;
  }

  return `/${slug}/${chapterId}#${headingId}`;
}

export function buildMarkdownHref({ headingId }) {
  if (!headingId) {
    return null;
  }

  return `#${headingId}`;
}

export function buildSectionTargetIndex({ headings }) {
  const sectionTargets = new Map();

  headings.forEach((heading) => {
    const sectionNumber = extractHeadingSectionNumber(heading.text ?? '');
    if (!sectionNumber) {
      return;
    }

    const target = {
      ...heading,
      sectionNumber,
    };
    const existing = sectionTargets.get(sectionNumber) ?? [];
    existing.push(target);
    sectionTargets.set(sectionNumber, existing);
  });

  return sectionTargets;
}

function appendLookback(lookback, value) {
  const next = `${lookback}${value ?? ''}`;
  return next.slice(-LOOKBACK_LIMIT);
}

function buildContextSnippet(lookback, tokenText, trailingText) {
  return `${lookback}${tokenText}${trailingText.slice(0, 48)}`.trim();
}

function createDiagnostic(category, diagnosticBase, tokenText, sectionNumber, lookback, trailingText, extra = {}) {
  return {
    category,
    tokenText,
    sectionNumber,
    snippet: buildContextSnippet(lookback, tokenText, trailingText),
    ...diagnosticBase,
    ...extra,
  };
}

function isUnsupportedShape({ lookback, trailingText }) {
  const previousSignificantChar = lookback.match(/\S(?=\s*$)/)?.[0] ?? null;

  if (previousSignificantChar === '§') {
    return true;
  }

  if (previousSignificantChar && /[-/–—]/.test(previousSignificantChar)) {
    return true;
  }

  if (/^\s*[-/–—]/.test(trailingText)) {
    return true;
  }

  if (/^\([a-z]\)/i.test(trailingText)) {
    return true;
  }

  return false;
}

function isExternalCitation(lookback) {
  return EXTERNAL_CITATION_PATTERNS.some((pattern) => pattern.test(lookback));
}

function isExternalCitationByTrailingText(trailingText) {
  return /^\s+of\s+the\s+(?:draft|spec|specification)\b/i.test(trailingText);
}

function resolveSectionTarget(targetIndex, sectionNumber) {
  const matches = targetIndex.get(sectionNumber) ?? [];

  if (matches.length === 0) {
    return { status: 'unresolved', matches: [] };
  }

  if (matches.length > 1) {
    return { status: 'ambiguous', matches };
  }

  return { status: 'resolved', matches, target: matches[0] };
}

export function linkifyTextValue(value, { buildHref, diagnosticBase = {}, lookback = '', targetIndex }) {
  const parts = [];
  const diagnostics = [];
  let cursor = 0;
  let rollingLookback = lookback;
  let hasLinks = false;
  XREF_TOKEN_RE.lastIndex = 0;

  for (const match of value.matchAll(XREF_TOKEN_RE)) {
    const tokenText = match[0];
    const start = match.index ?? 0;
    const end = start + tokenText.length;
    const sectionNumber = tokenText.slice(1);
    const plainTextBefore = value.slice(cursor, start);
    const lookbackBeforeToken = appendLookback(rollingLookback, plainTextBefore);
    const trailingText = value.slice(end);

    if (plainTextBefore) {
      parts.push({ type: 'text', value: plainTextBefore });
    }

    if (isUnsupportedShape({ lookback: lookbackBeforeToken, trailingText })) {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'skipped_unsupported_xref_shape',
        diagnosticBase,
        tokenText,
        sectionNumber,
        lookbackBeforeToken,
        trailingText,
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    if (isExternalCitation(lookbackBeforeToken) || isExternalCitationByTrailingText(trailingText)) {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'skipped_external_citation',
        diagnosticBase,
        tokenText,
        sectionNumber,
        lookbackBeforeToken,
        trailingText,
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    const resolution = resolveSectionTarget(targetIndex, sectionNumber);
    if (resolution.status === 'unresolved') {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'unresolved_internal_xref',
        diagnosticBase,
        tokenText,
        sectionNumber,
        lookbackBeforeToken,
        trailingText,
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    if (resolution.status === 'ambiguous') {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'ambiguous_internal_xref',
        diagnosticBase,
        tokenText,
        sectionNumber,
        lookbackBeforeToken,
        trailingText,
        {
          candidateTargets: resolution.matches.map((item) => ({
            chapterId: item.chapterId ?? null,
            headingId: item.headingId ?? null,
            headingText: item.text ?? null,
          })),
        },
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    const href = buildHref(resolution.target);
    if (!href) {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'unresolved_internal_xref',
        diagnosticBase,
        tokenText,
        sectionNumber,
        lookbackBeforeToken,
        trailingText,
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    parts.push({
      type: 'link',
      href,
      text: tokenText,
      target: resolution.target,
    });
    hasLinks = true;
    rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
    cursor = end;
  }

  const trailingPlainText = value.slice(cursor);
  if (trailingPlainText || parts.length === 0) {
    parts.push({ type: 'text', value: trailingPlainText });
  }

  return {
    changed: hasLinks,
    diagnostics,
    lookback: appendLookback(rollingLookback, trailingPlainText),
    parts,
  };
}

function createHastLinkNode(part, slug) {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: part.href,
      'data-doc-xref': 'true',
      'data-doc-slug': slug,
      'data-doc-chapter-id': part.target.chapterId ?? '',
      'data-doc-heading-id': part.target.headingId ?? '',
    },
    children: [
      {
        type: 'text',
        value: part.text,
      },
    ],
  };
}

function extractVisibleTextFromHast(node) {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    return node.value ?? '';
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map(extractVisibleTextFromHast).join('');
}

function rewriteHastInlineChildren(children, options, state = { lookback: '' }) {
  const nextChildren = [];
  let lookback = state.lookback;
  let changed = false;
  const diagnostics = [];

  children.forEach((child) => {
    if (child?.type === 'text') {
      const result = linkifyTextValue(child.value ?? '', {
        buildHref: buildReaderHref,
        diagnosticBase: {
          ...options.diagnosticBase,
          line: child.position?.start?.line ?? options.diagnosticBase.line ?? null,
        },
        lookback,
        targetIndex: options.targetIndex,
      });

      result.parts.forEach((part) => {
        if (part.type === 'text') {
          if (part.value) {
            nextChildren.push({ type: 'text', value: part.value });
          }
          return;
        }

        nextChildren.push(createHastLinkNode(part, options.slug));
      });

      lookback = result.lookback;
      changed = changed || result.changed;
      diagnostics.push(...result.diagnostics);
      return;
    }

    if (child?.type === 'element') {
      if (HAST_FORBIDDEN_TAGS.has(child.tagName) || HAST_ELIGIBLE_CONTAINER_TAGS.has(child.tagName)) {
        nextChildren.push(child);
        lookback = appendLookback(lookback, extractVisibleTextFromHast(child));
        return;
      }

      if (Array.isArray(child.children)) {
        const nested = rewriteHastInlineChildren(child.children, options, { lookback });
        child.children = nested.children;
        nextChildren.push(child);
        lookback = nested.lookback;
        changed = changed || nested.changed;
        diagnostics.push(...nested.diagnostics);
        return;
      }
    }

    nextChildren.push(child);
    lookback = appendLookback(lookback, extractVisibleTextFromHast(child));
  });

  return {
    children: nextChildren,
    changed,
    diagnostics,
    lookback,
  };
}

export function rewriteHastCrossReferences(tree, options) {
  const diagnostics = [];

  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type !== 'element') {
      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
      return;
    }

    if (HAST_FORBIDDEN_TAGS.has(node.tagName)) {
      return;
    }

    if (HAST_ELIGIBLE_CONTAINER_TAGS.has(node.tagName) && Array.isArray(node.children)) {
      const rewritten = rewriteHastInlineChildren(node.children, options, { lookback: '' });
      node.children = rewritten.children;
      diagnostics.push(...rewritten.diagnostics);
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return diagnostics;
}

function extractVisibleTextFromMdast(node) {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    return node.value ?? '';
  }

  if (typeof node.value === 'string' && !Array.isArray(node.children)) {
    return node.value;
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map(extractVisibleTextFromMdast).join('');
}

function collectMdastInlineReplacements(children, options, state = { lookback: '' }) {
  const replacements = [];
  const diagnostics = [];
  let lookback = state.lookback;

  children.forEach((child) => {
    if (!child || typeof child !== 'object') {
      return;
    }

    if (child.type === 'text') {
      const result = linkifyTextValue(child.value ?? '', {
        buildHref: buildMarkdownHref,
        diagnosticBase: {
          ...options.diagnosticBase,
          line: child.position?.start?.line ?? options.diagnosticBase.line ?? null,
        },
        lookback,
        targetIndex: options.targetIndex,
      });

      if (result.changed) {
        const start = child.position?.start?.offset;
        const end = child.position?.end?.offset;
        if (Number.isInteger(start) && Number.isInteger(end)) {
          replacements.push({
            start,
            end,
            value: result.parts.map((part) => {
              if (part.type === 'text') {
                return part.value;
              }

              return `[${part.text}](${part.href})`;
            }).join(''),
          });
        }
      }

      lookback = result.lookback;
      diagnostics.push(...result.diagnostics);
      return;
    }

    if (MDAST_FORBIDDEN_TYPES.has(child.type) || MDAST_ELIGIBLE_CONTAINER_TYPES.has(child.type)) {
      lookback = appendLookback(lookback, extractVisibleTextFromMdast(child));
      return;
    }

    if (Array.isArray(child.children)) {
      const nested = collectMdastInlineReplacements(child.children, options, { lookback });
      replacements.push(...nested.replacements);
      diagnostics.push(...nested.diagnostics);
      lookback = nested.lookback;
      return;
    }

    lookback = appendLookback(lookback, extractVisibleTextFromMdast(child));
  });

  return {
    diagnostics,
    lookback,
    replacements,
  };
}

export function collectMarkdownCrossReferenceReplacements(tree, options) {
  const diagnostics = [];
  const replacements = [];

  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (MDAST_FORBIDDEN_TYPES.has(node.type)) {
      return;
    }

    if (MDAST_ELIGIBLE_CONTAINER_TYPES.has(node.type) && Array.isArray(node.children)) {
      const result = collectMdastInlineReplacements(node.children, options, { lookback: '' });
      replacements.push(...result.replacements);
      diagnostics.push(...result.diagnostics);
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  replacements.sort((left, right) => right.start - left.start);

  return {
    diagnostics,
    replacements,
  };
}

export function applyTextReplacements(source, replacements) {
  return replacements.reduce(
    (current, replacement) => `${current.slice(0, replacement.start)}${replacement.value}${current.slice(replacement.end)}`,
    source,
  );
}
