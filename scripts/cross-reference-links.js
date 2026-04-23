import GithubSlugger from 'github-slugger';
import arfMainReference from './data/arf-main-v2.8.0-sections.js';
import arfTopicReference from './data/arf-topics-v2.8.0.js';

const LOOKBACK_LIMIT = 96;
const EXTERNAL_CITATION_LOOKBACK_TOKENS = 6;
const XREF_RANGE_TOKEN_RE = /(§\d+(?:\.\d+)*)(\s*[-–—]\s*(?:§\s*)?\d+(?:\.\d+)*)/g;
const XREF_TOKEN_RE = /§\d+(?:\.\d+)*/g;
const ARF_TOPIC_TOKEN_RE = /\bARF(?:(?:\s+Discussion(?:\s+Paper)?)|(?:\s+Annex\s+2,?))?\s*(?:[—-]\s*)?Topic\s+(?:[A-Z]{1,2}|\d+)\b/g;
const BARE_ARF_TOPIC_TOKEN_RE = /\b(?:(?:Annex(?:\s+2)?|Discussion(?:\s+Paper)?)\s+)?Topic\s+(?:[A-Z]{1,2}|\d+)\b(?!\s*\/\s*(?:Topic\s+)?[A-Z]{1,2}\b)/g;
const LABEL_TOKEN_RE = /\b(?:Key Finding \d+|KF \d+|Finding F-?\d+|Finding \d+|OQ(?:\d+|-\d+|\s+#\d+|\s+\d+)|Open Question(?:\s+#\d+|\s+\d+))\b/g;
const BARE_ARF_TOPIC_DOCUMENT_SLUGS = new Set([
  'DR-0002-eudi-wallet-relying-party-integration',
]);
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
  /\b\(?EU\)?\s+\d{4}\/\d+\s*,?\s*$/i,
  /\bHIPAA\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bPCI\s+DSS\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\bOWASP\b(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\b(?:OID4VP|OID4VCI|OAuth|OpenID|FAPI)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bCIBA(?:\s+Core)?\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOIDC\s+Core\b(?:[\s,./():'’-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOpenID4VP\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOpenID\s+Connect\s+Core\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bPID\s+Rulebook\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bSD-JWT\s+VC\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bCSC\s+API\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\b(?:SAMLCore|SAMLProf)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bOASIS\s+SAML(?:\s+V\d+(?:\.\d+)*)?(?:\s+Core)?\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bMS-[A-Z0-9-]+\b(?:[\s,./():'’-]+\w[\w.-]*){0,8}\s*$/i,
  /\bWebAuthn(?:\s+Level\s+\d+)?\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bFielding\s+\d{4},?\s*$/i,
  /\bFielding\s+\d{4}\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\b(?:SOX|Sarbanes-Oxley)\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bCUBI\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bW3C\s+DBSC\b(?:[\s,./()-]+\w[\w.-]*){0,8}\s*$/i,
  /\bTopic\s+\d[\w.-]*(?:[\s,./()-]+\w[\w.-]*){0,6}\s*$/i,
  /\b(?:DPDP\s+Act|Federal\s+Law\s+\d[\w-]*)\b(?:[\s,./():'’-]+\w[\w.-]*){0,8}\s*$/i,
];
const INTERNAL_REFERENCE_PREFIX_RE = /\b(?:see|from|in|under|via|within|cross[- ]reference:?|described\s+in|documented\s+in|discussed\s+in|covered\s+(?:in\s+detail\s+)?in|referenced\s+in|mapped\s+in|detailed\s+in|analysed\s+in|analyzed\s+in)\s*$/i;
const INTERNAL_REFERENCE_SUFFIX_RE = /^\s*(?:\)|\]|\.)?\s*(?:covers?|covered|describes?|described|discusses?|documented|details?|maps?|mapped|explains?|analyses?|analyzes?|provides?|traces?|shows?)\b/i;
const STRONG_EXTERNAL_SOURCE_RE = /\b(?:RFC|NIST(?:\s+SP)?|ISO|ETSI|CIR|ARF|TS\d+|HIPAA|PCI\s+DSS|OWASP|OID4VP|OID4VCI|OAuth|OpenID|CIBA(?:\s+Core)?|OIDC\s+Core|OpenID\s+Connect\s+Core|PID\s+Rulebook|SD-JWT\s+VC|CSC\s+API|SAMLCore|SAMLProf|OASIS\s+SAML|WebAuthn(?:\s+Level\s+\d+)?|Fielding\s+\d{4}|SOX|Sarbanes-Oxley|CUBI|W3C\s+DBSC|Topic\s+\d|MS-[A-Z0-9-]+|DPDP\s+Act|Federal\s+Law)\b(?:[\s,./():'’-]+\w[\w.-]*)*$/i;
const ARF_MAIN_EXPLICIT_PREFIX_RE = /\bARF(?:\s+Main\s+Document)?(?:\s+v\d+(?:\.\d+){0,2})?,?\s*$/i;
const ARF_MAIN_EXPLICIT_SUFFIX_RE = /^\s+of\s+the\s+ARF(?:\s+Main\s+Document)?\b/i;
const ARF_MAIN_PRIOR_SECTION_RE = /\bARF(?:\s+Main\s+Document)?(?:\s+v\d+(?:\.\d+){0,2})?,?\s*§\d+(?:\.\d+)*/i;
const ARF_TOPIC_EXPLICIT_PREFIX_RE = /\bARF(?:(?:\s+Discussion(?:\s+Paper)?)|(?:\s+Annex\s+2,?))?\s*(?:[—-]\s*)?Topic\s+(?:[A-Z]{1,2}|\d+)(?:\s*,\s*)?$/i;
const TARGET_HEADING_CUE_STOP_WORDS = new Set(['a', 'an', 'and', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);
const STRUCTURAL_LABEL_CUE_WORDS = new Set(['mode', 'model', 'option', 'pattern']);

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

function stripLeadingSectionEnumeration(value) {
  return normalizeWhitespace(value).replace(/^§?\s*\d+(?:\.\d+)*(?:\.)?\s+/, '');
}

function isOpenQuestionsHeading(value) {
  return stripLeadingSectionEnumeration(value).toLowerCase().startsWith('open questions');
}

function isFindingsHeading(value) {
  const normalized = stripLeadingSectionEnumeration(value).toLowerCase();
  return normalized === 'findings' || normalized === 'key findings';
}

function normalizeFindingKey(identifier) {
  return /^f-?\d+$/i.test(identifier)
    ? `finding-${identifier.toLowerCase().replace(/^f-?/, 'f-')}`
    : `finding-${identifier}`;
}

function normalizeOqKey(identifier) {
  return `oq-${identifier}`;
}

function matchFindingHeading(text) {
  const normalized = stripLeadingSectionEnumeration(text);
  let match = normalized.match(/^Key Finding\s+(\d+)\b/i)
    ?? normalized.match(/^Finding\s+(\d+)\b/i)
    ?? normalized.match(/^KF\s+(\d+)\b/i);

  if (match) {
    return {
      family: 'finding',
      normalizedKey: normalizeFindingKey(match[1]),
    };
  }

  match = normalized.match(/^F-?(\d+)\b/i);
  if (match) {
    return {
      family: 'finding',
      normalizedKey: normalizeFindingKey(`F-${match[1]}`),
    };
  }

  return null;
}

function matchOpenQuestionHeading(text) {
  const normalized = stripLeadingSectionEnumeration(text);
  const match = normalized.match(/^OQ-?(\d+)\b/i)
    ?? normalized.match(/^Open Question\s+#?(\d+)\b/i);

  if (!match) {
    return null;
  }

  return {
    family: 'oq',
    normalizedKey: normalizeOqKey(match[1]),
  };
}

export function normalizeLabelReferenceToken(tokenText) {
  const normalized = normalizeWhitespace(tokenText);
  let match = normalized.match(/^Key Finding (\d+)$/)
    ?? normalized.match(/^KF (\d+)$/)
    ?? normalized.match(/^Finding (\d+)$/);

  if (match) {
    return {
      family: 'finding',
      normalizedKey: normalizeFindingKey(match[1]),
    };
  }

  match = normalized.match(/^Finding F-?(\d+)$/);
  if (match) {
    return {
      family: 'finding',
      normalizedKey: normalizeFindingKey(`F-${match[1]}`),
    };
  }

  match = normalized.match(/^OQ(\d+)$/)
    ?? normalized.match(/^OQ-(\d+)$/)
    ?? normalized.match(/^OQ (\d+)$/)
    ?? normalized.match(/^OQ #(\d+)$/)
    ?? normalized.match(/^Open Question (\d+)$/)
    ?? normalized.match(/^Open Question #(\d+)$/);

  if (match) {
    return {
      family: 'oq',
      normalizedKey: normalizeOqKey(match[1]),
    };
  }

  return null;
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

export function buildLabelTargetIndex({ targets }) {
  const labelTargets = new Map();

  targets.forEach((target) => {
    const existing = labelTargets.get(target.normalizedKey) ?? [];
    existing.push(target);
    labelTargets.set(target.normalizedKey, existing);
  });

  return labelTargets;
}

function appendLookback(lookback, value) {
  const next = `${lookback}${value ?? ''}`;
  return next.slice(-LOOKBACK_LIMIT);
}

function buildContextSnippet(lookback, tokenText, trailingText) {
  return `${lookback}${tokenText}${trailingText.slice(0, 48)}`.trim();
}

function createDiagnostic(category, diagnosticBase, tokenText, referenceValue, lookback, trailingText, extra = {}) {
  return {
    category,
    tokenText,
    referenceValue,
    snippet: buildContextSnippet(lookback, tokenText, trailingText),
    ...diagnosticBase,
    ...extra,
  };
}

function normalizeCitationLookback(lookback) {
  return lookback.replace(/[\s,;:()[\]{}]+$/g, '');
}

function extractCitationLookbackWindow(lookback) {
  const normalized = normalizeCitationLookback(lookback);
  if (!normalized) {
    return '';
  }

  return normalized
    .split(/\s+/)
    .slice(-EXTERNAL_CITATION_LOOKBACK_TOKENS)
    .join(' ');
}

function normalizeTopicMatchText(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[^a-z0-9+./ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTrailingTopicPhrase(lookback) {
  const normalized = normalizeCitationLookback(lookback);
  const match = normalized.match(/([A-Z][A-Za-z0-9+./-]*(?:\s+[A-Z0-9][A-Za-z0-9+./-]*){0,6})$/);
  return match ? match[1] : null;
}

function normalizeHeadingCueWord(value) {
  const normalized = value.toLowerCase();
  if (normalized.length > 3 && normalized.endsWith('s')) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function extractTargetHeadingCueWords(target) {
  if (!target?.text) {
    return [];
  }

  return normalizeTopicMatchText(stripLeadingSectionEnumeration(target.text))
    .split(' ')
    .filter(Boolean)
    .map(normalizeHeadingCueWord)
    .filter((word) => !TARGET_HEADING_CUE_STOP_WORDS.has(word));
}

function trailingTextStartsWithTargetHeadingCue({ trailingText, target }) {
  const trimmedTrailing = trailingText.trimStart();
  if (!trimmedTrailing || !/^[A-Za-z0-9]/.test(trimmedTrailing)) {
    return false;
  }

  const headingCueWords = extractTargetHeadingCueWords(target);
  if (headingCueWords.length < 2) {
    return false;
  }

  const trailingCueWords = normalizeTopicMatchText(trimmedTrailing)
    .split(' ')
    .filter(Boolean)
    .map(normalizeHeadingCueWord);

  return trailingCueWords[0] === headingCueWords[0] && trailingCueWords[1] === headingCueWords[1];
}

function lookbackEndsWithStructuralLabelCue(lookback) {
  return /\b(?:Model|Pattern|Option|Mode)\s+[A-Z0-9]+\s*,?\s*$/i.test(normalizeCitationLookback(lookback));
}

function targetHeadingSupportsStructuralLabelCue(target) {
  const headingCueWords = extractTargetHeadingCueWords(target);
  return headingCueWords.some((word) => STRUCTURAL_LABEL_CUE_WORDS.has(word));
}

function hasTargetHeadingCue({ lookback, trailingText, target }) {
  if (!target?.text) {
    return false;
  }

  if (trailingTextStartsWithTargetHeadingCue({ trailingText, target })) {
    return true;
  }

  if (lookbackEndsWithStructuralLabelCue(lookback) && targetHeadingSupportsStructuralLabelCue(target)) {
    return true;
  }

  return false;
}

function targetHeadingStartsWithTrailingTopic({ lookback, target }) {
  const topicPhrase = extractTrailingTopicPhrase(lookback);
  if (!topicPhrase || !target?.text) {
    return false;
  }

  const normalizedHeading = normalizeTopicMatchText(stripLeadingSectionEnumeration(target.text));
  const normalizedTopic = normalizeTopicMatchText(topicPhrase);

  if (!normalizedHeading || !normalizedTopic) {
    return false;
  }

  return normalizedHeading.startsWith(normalizedTopic);
}

function hasInternalReferenceCue({ lookback, trailingText, target = null }) {
  const normalizedPrefix = normalizeCitationLookback(lookback);

  if (INTERNAL_REFERENCE_PREFIX_RE.test(normalizedPrefix) || /DR-\d{4}\s*$/i.test(normalizedPrefix)) {
    return true;
  }

  if (hasTargetHeadingCue({ lookback: normalizedPrefix, trailingText, target })) {
    return true;
  }

  if (!INTERNAL_REFERENCE_SUFFIX_RE.test(trailingText)) {
    return false;
  }

  if (!STRONG_EXTERNAL_SOURCE_RE.test(normalizedPrefix)) {
    return true;
  }

  return targetHeadingStartsWithTrailingTopic({ lookback: normalizedPrefix, target });
}

function hasReferenceSeparatorBeforeToken(lookback) {
  return /§\d+(?:\.\d+)*\s*[-/–—]\s*$/.test(lookback);
}

function hasReferenceSeparatorAfterToken(trailingText) {
  return /^\s*[-/–—]\s*(?:§\s*)?\d/.test(trailingText);
}

function isUnsupportedShape({ lookback, trailingText }) {
  const previousSignificantChar = lookback.match(/\S(?=\s*$)/)?.[0] ?? null;

  if (previousSignificantChar === '§') {
    return true;
  }

  if (hasReferenceSeparatorBeforeToken(lookback)) {
    return true;
  }

  if (hasReferenceSeparatorAfterToken(trailingText)) {
    return true;
  }

  if (/^\([a-z]\)/i.test(trailingText)) {
    return true;
  }

  return false;
}

function isExternalCitation(lookback) {
  const normalized = extractCitationLookbackWindow(lookback);
  return EXTERNAL_CITATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isExternalCitationByTrailingText(trailingText) {
  return /^\s+of\s+the\s+(?:draft|spec|specification)\b/i.test(trailingText);
}

function hasExplicitArfMainReferenceCue({ lookback, trailingText }) {
  return ARF_MAIN_EXPLICIT_PREFIX_RE.test(lookback) || ARF_MAIN_EXPLICIT_SUFFIX_RE.test(trailingText);
}

function hasPriorExplicitArfSectionReference(lookback) {
  return ARF_MAIN_PRIOR_SECTION_RE.test(lookback);
}

function hasPriorExplicitArfTopicReference(lookback) {
  return ARF_TOPIC_EXPLICIT_PREFIX_RE.test(lookback);
}

function allowsBareArfTopicReferences(diagnosticBase) {
  return BARE_ARF_TOPIC_DOCUMENT_SLUGS.has(diagnosticBase?.documentSlug ?? '');
}

function normalizeArfTopicReferenceToken(tokenText) {
  const normalizedToken = normalizeWhitespace(tokenText);
  const identifierMatch = normalizedToken.match(/\bTopic\s+([A-Z]{1,2}|\d+)\b/i);
  if (!identifierMatch) {
    return null;
  }

  const topicId = identifierMatch[1].toUpperCase();
  const isDiscussionOnly = /\bDiscussion(?:\s+Paper)?\b/i.test(normalizedToken);
  const isAnnexOnly = /\bAnnex(?:\s+2)?\b/i.test(normalizedToken);

  if (isDiscussionOnly && isAnnexOnly) {
    return null;
  }

  if (isDiscussionOnly) {
    return {
      topicId,
      topicKind: 'discussion',
    };
  }

  if (isAnnexOnly) {
    return {
      topicId,
      topicKind: 'annex',
    };
  }

  return {
    topicId,
    topicKind: /^\d+$/.test(topicId) ? 'annex' : 'discussion',
  };
}

function resolveArfTopicTarget(tokenText) {
  const topicInfo = normalizeArfTopicReferenceToken(tokenText);
  if (!topicInfo) {
    return null;
  }

  if (topicInfo.topicKind === 'annex') {
    const topic = arfTopicReference.annexTopics?.[topicInfo.topicId];
    if (!topic) {
      return null;
    }

    return {
      ...topic,
      linkKind: 'external',
      sourceDocument: 'arf-topic-annex-2',
      topicId: topicInfo.topicId,
      topicKind: 'annex',
    };
  }

  const topic = arfTopicReference.discussionTopics?.[topicInfo.topicId];
  if (!topic) {
    return null;
  }

  return {
    ...topic,
    linkKind: 'external',
    sourceDocument: 'arf-topic-discussion',
    topicId: topicInfo.topicId,
    topicKind: 'discussion',
  };
}

function buildArfTopicHref(tokenText) {
  const target = resolveArfTopicTarget(tokenText);
  if (!target) {
    return null;
  }

  if (target.topicKind === 'annex') {
    return new URL(`#${target.headingId}`, arfTopicReference.annexTopicsBaseUrl).toString();
  }

  return new URL(`${target.path}/`, arfTopicReference.discussionTopicsBaseUrl).toString();
}

function resolveArfMainTarget(sectionNumber) {
  const section = arfMainReference.sections?.[sectionNumber];
  if (!section) {
    return null;
  }

  return {
    ...section,
    headingText: section.text,
    linkKind: 'external',
    sourceDocument: 'arf-main',
    sectionNumber,
  };
}

function buildArfMainHref(sectionNumber) {
  const target = resolveArfMainTarget(sectionNumber);
  if (!target) {
    return null;
  }

  return new URL(`#${target.headingId}`, arfMainReference.baseUrl).toString();
}

function splitDiagnosticSnippet(diagnostic) {
  const snippet = diagnostic?.snippet ?? '';
  const tokenText = diagnostic?.tokenText ?? '';
  const tokenIndex = snippet.indexOf(tokenText);

  if (tokenIndex === -1) {
    return {
      beforeToken: snippet,
      afterToken: '',
    };
  }

  return {
    beforeToken: snippet.slice(0, tokenIndex),
    afterToken: snippet.slice(tokenIndex + tokenText.length),
  };
}

export function collectLikelyFalsePositiveExternalSkips({ diagnostics, targetIndex }) {
  if (!(targetIndex instanceof Map)) {
    return [];
  }

  return diagnostics
    .filter((diagnostic) => diagnostic?.category === 'skipped_external_citation')
    .filter((diagnostic) => (targetIndex.get(diagnostic.referenceValue)?.length ?? 0) === 1)
    .filter((diagnostic) => {
      const { beforeToken, afterToken } = splitDiagnosticSnippet(diagnostic);
      const target = targetIndex.get(diagnostic.referenceValue)?.[0] ?? null;
      return hasInternalReferenceCue({
        lookback: beforeToken,
        trailingText: afterToken,
        target,
      });
    })
    .map((diagnostic) => {
      const target = targetIndex.get(diagnostic.referenceValue)?.[0] ?? null;
      return {
        ...diagnostic,
        headingId: target?.headingId ?? null,
        headingText: target?.text ?? null,
      };
    });
}

function resolveTarget(targetIndex, referenceValue) {
  const matches = targetIndex.get(referenceValue) ?? [];

  if (matches.length === 0) {
    return { status: 'unresolved', matches: [] };
  }

  if (matches.length > 1) {
    return { status: 'ambiguous', matches };
  }

  return { status: 'resolved', matches, target: matches[0] };
}

function findNextRegexMatch(regex, value, cursor) {
  regex.lastIndex = cursor;
  const match = regex.exec(value);
  if (!match) {
    return null;
  }

  return {
    match,
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  };
}

function findNextReferenceToken(value, cursor, { allowBareArfTopics = false } = {}) {
  const sectionRangeMatch = findNextRegexMatch(XREF_RANGE_TOKEN_RE, value, cursor);
  const sectionMatch = findNextRegexMatch(XREF_TOKEN_RE, value, cursor);
  const topicMatch = findNextRegexMatch(ARF_TOPIC_TOKEN_RE, value, cursor);
  const bareTopicMatch = allowBareArfTopics
    ? findNextRegexMatch(BARE_ARF_TOPIC_TOKEN_RE, value, cursor)
    : null;
  const labelMatch = findNextRegexMatch(LABEL_TOKEN_RE, value, cursor);

  const matches = [
    sectionRangeMatch ? {
      kind: 'sectionRange',
      tokenText: sectionRangeMatch.match[0],
      firstTokenText: sectionRangeMatch.match[1],
      rangeTailText: sectionRangeMatch.match[2],
      start: sectionRangeMatch.start,
      end: sectionRangeMatch.end,
    } : null,
    sectionMatch ? {
      kind: 'section',
      tokenText: sectionMatch.match[0],
      start: sectionMatch.start,
      end: sectionMatch.end,
    } : null,
    topicMatch ? {
      kind: 'topic',
      tokenText: topicMatch.match[0],
      start: topicMatch.start,
      end: topicMatch.end,
    } : null,
    bareTopicMatch ? {
      kind: 'topic',
      tokenText: bareTopicMatch.match[0],
      start: bareTopicMatch.start,
      end: bareTopicMatch.end,
    } : null,
    labelMatch ? {
      kind: 'label',
      tokenText: labelMatch.match[0],
      start: labelMatch.start,
      end: labelMatch.end,
    } : null,
  ].filter(Boolean);

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => left.start - right.start || (right.end - right.start) - (left.end - left.start));
  return matches[0];
}

export function linkifyTextValue(value, { buildHref, diagnosticBase = {}, lookback = '', targetIndex, labelTargetIndex }) {
  const parts = [];
  const diagnostics = [];
  let cursor = 0;
  let rollingLookback = lookback;
  let hasLinks = false;

  while (true) {
    const nextToken = findNextReferenceToken(value, cursor, {
      allowBareArfTopics: allowsBareArfTopicReferences(diagnosticBase),
    });
    if (!nextToken) {
      break;
    }

    const { kind, tokenText, start, end } = nextToken;
    const plainTextBefore = value.slice(cursor, start);
    const lookbackBeforeToken = appendLookback(rollingLookback, plainTextBefore);
    const trailingText = value.slice(end);

    if (plainTextBefore) {
      parts.push({ type: 'text', value: plainTextBefore });
    }

    if (kind === 'topic') {
      const arfTopicTarget = resolveArfTopicTarget(tokenText);
      const arfTopicHref = buildArfTopicHref(tokenText);

      if (!arfTopicTarget || !arfTopicHref) {
        parts.push({ type: 'text', value: tokenText });
        diagnostics.push(createDiagnostic(
          'unresolved_external_arf_topic',
          diagnosticBase,
          tokenText,
          tokenText,
          lookbackBeforeToken,
          trailingText,
          {
            sourceDocument: 'arf-topic',
            sourceVersion: arfTopicReference.version,
          },
        ));
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }

      parts.push({
        type: 'link',
        href: arfTopicHref,
        text: tokenText,
        target: arfTopicTarget,
      });
      hasLinks = true;
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    if (kind === 'section' || kind === 'sectionRange') {
      const firstTokenText = nextToken.firstTokenText ?? tokenText;
      const rangeTailText = nextToken.rangeTailText ?? '';
      const sectionNumber = firstTokenText.slice(1);
      const trailingTextForReference = kind === 'sectionRange' ? value.slice(end) : trailingText;

      if (hasExplicitArfMainReferenceCue({ lookback: lookbackBeforeToken, trailingText: trailingTextForReference })) {
        const arfTarget = resolveArfMainTarget(sectionNumber);
        const arfHref = buildArfMainHref(sectionNumber);

        if (!arfTarget || !arfHref) {
          parts.push({ type: 'text', value: tokenText });
          diagnostics.push(createDiagnostic(
            'unresolved_external_arf_section',
            diagnosticBase,
            tokenText,
            sectionNumber,
            lookbackBeforeToken,
            trailingTextForReference,
            {
              sourceDocument: 'arf-main',
              sourceVersion: arfMainReference.version,
            },
          ));
          rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
          cursor = end;
          continue;
        }

        parts.push({
          type: 'link',
          href: arfHref,
          text: firstTokenText,
          target: arfTarget,
        });
        if (rangeTailText) {
          parts.push({ type: 'text', value: rangeTailText });
        }
        hasLinks = true;
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }

      if (hasPriorExplicitArfSectionReference(lookbackBeforeToken)) {
        parts.push({ type: 'text', value: tokenText });
        diagnostics.push(createDiagnostic(
          'skipped_implicit_arf_reference',
          diagnosticBase,
          tokenText,
          sectionNumber,
          lookbackBeforeToken,
          trailingTextForReference,
          {
            sourceDocument: 'arf-main',
            sourceVersion: arfMainReference.version,
          },
        ));
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }

      if (hasPriorExplicitArfTopicReference(lookbackBeforeToken)) {
        parts.push({ type: 'text', value: tokenText });
        diagnostics.push(createDiagnostic(
          'skipped_implicit_arf_topic_section_reference',
          diagnosticBase,
          tokenText,
          sectionNumber,
          lookbackBeforeToken,
          trailingTextForReference,
          {
            sourceDocument: 'arf-topic',
            sourceVersion: arfTopicReference.version,
          },
        ));
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }

      if (isUnsupportedShape({ lookback: lookbackBeforeToken, trailingText: trailingTextForReference })) {
        parts.push({ type: 'text', value: tokenText });
        diagnostics.push(createDiagnostic(
          'skipped_unsupported_xref_shape',
          diagnosticBase,
          tokenText,
          sectionNumber,
          lookbackBeforeToken,
          trailingTextForReference,
        ));
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }

      const resolution = resolveTarget(targetIndex ?? new Map(), sectionNumber);
      const hasInternalCue = hasInternalReferenceCue({
        lookback: lookbackBeforeToken,
        trailingText: trailingTextForReference,
        target: resolution.status === 'resolved' ? resolution.target : null,
      });

      if (!hasInternalCue && (isExternalCitation(lookbackBeforeToken) || isExternalCitationByTrailingText(trailingTextForReference))) {
        parts.push({ type: 'text', value: tokenText });
        diagnostics.push(createDiagnostic(
          'skipped_external_citation',
          diagnosticBase,
          tokenText,
          sectionNumber,
          lookbackBeforeToken,
          trailingTextForReference,
        ));
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }
      if (resolution.status === 'unresolved') {
        parts.push({ type: 'text', value: tokenText });
        diagnostics.push(createDiagnostic(
          'unresolved_internal_xref',
          diagnosticBase,
          tokenText,
          sectionNumber,
          lookbackBeforeToken,
          trailingTextForReference,
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
          trailingTextForReference,
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
          trailingTextForReference,
        ));
        rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
        cursor = end;
        continue;
      }

      parts.push({
        type: 'link',
        href,
        text: firstTokenText,
        target: resolution.target,
      });
      if (rangeTailText) {
        parts.push({ type: 'text', value: rangeTailText });
      }
      hasLinks = true;
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    const labelInfo = normalizeLabelReferenceToken(tokenText);
    if (!labelInfo) {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'skipped_unsupported_label_xref_shape',
        diagnosticBase,
        tokenText,
        tokenText,
        lookbackBeforeToken,
        trailingText,
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    const resolution = resolveTarget(labelTargetIndex ?? new Map(), labelInfo.normalizedKey);
    if (resolution.status === 'unresolved') {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'unresolved_internal_label_xref',
        diagnosticBase,
        tokenText,
        labelInfo.normalizedKey,
        lookbackBeforeToken,
        trailingText,
        {
          normalizedKey: labelInfo.normalizedKey,
          diagnosticFamily: labelInfo.family,
        },
      ));
      rollingLookback = appendLookback(lookbackBeforeToken, tokenText);
      cursor = end;
      continue;
    }

    if (resolution.status === 'ambiguous') {
      parts.push({ type: 'text', value: tokenText });
      diagnostics.push(createDiagnostic(
        'ambiguous_internal_label_xref',
        diagnosticBase,
        tokenText,
        labelInfo.normalizedKey,
        lookbackBeforeToken,
        trailingText,
        {
          normalizedKey: labelInfo.normalizedKey,
          diagnosticFamily: labelInfo.family,
          candidateTargets: resolution.matches.map((item) => ({
            chapterId: item.chapterId ?? null,
            headingId: item.headingId ?? null,
            labelText: item.labelText ?? null,
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
        'unresolved_internal_label_xref',
        diagnosticBase,
        tokenText,
        labelInfo.normalizedKey,
        lookbackBeforeToken,
        trailingText,
        {
          normalizedKey: labelInfo.normalizedKey,
          diagnosticFamily: labelInfo.family,
        },
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

function createHastLinkNode(part) {
  const isExternalLink = part.target?.linkKind === 'external';
  const properties = isExternalLink
    ? {
        href: part.href,
      }
    : {
        href: part.href,
        'data-doc-xref': 'true',
        'data-doc-slug': part.target.slug ?? '',
        'data-doc-chapter-id': part.target.chapterId ?? '',
        'data-doc-heading-id': part.target.headingId ?? '',
      };

  return {
    type: 'element',
    tagName: 'a',
    properties,
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
        labelTargetIndex: options.labelTargetIndex,
      });

      result.parts.forEach((part) => {
        if (part.type === 'text') {
          if (part.value) {
            nextChildren.push({ type: 'text', value: part.value });
          }
          return;
        }

        nextChildren.push(createHastLinkNode(part));
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

function pushCanonicalCandidate(candidates, candidate) {
  if (!candidate?.normalizedKey || !Number.isInteger(candidate.insertOffset)) {
    return;
  }

  candidates.push({
    ...candidate,
    aliasId: candidate.normalizedKey,
    headingId: candidate.normalizedKey,
    labelText: candidate.labelText ?? candidate.normalizedKey,
  });
}

function buildMarkdownAnchorInsertion(anchorId, style) {
  if (style === 'inline') {
    return `<a id="${anchorId}"></a> `;
  }

  if (style === 'heading-tail') {
    return `\n<a id="${anchorId}"></a>`;
  }

  return `<a id="${anchorId}"></a>\n`;
}

function computeHeadingTailInsertOffset(node) {
  const endOffset = node?.position?.end?.offset;
  if (!Number.isInteger(endOffset)) {
    return null;
  }

  return endOffset;
}

function inferHeadingContext(headingStack) {
  return {
    inFindings: headingStack.some((heading) => isFindingsHeading(heading.text)),
    inOpenQuestions: headingStack.some((heading) => isOpenQuestionsHeading(heading.text)),
  };
}

function collectListTargets(node, headingContext, candidates) {
  if (!node.ordered || (!headingContext.inOpenQuestions && !headingContext.inFindings)) {
    return false;
  }

  const startNumber = Number.isInteger(node.start) ? node.start : 1;
  node.children.forEach((item, index) => {
    const insertOffset = item.children?.[0]?.position?.start?.offset;
    const itemNumber = startNumber + index;

    if (headingContext.inFindings) {
      pushCanonicalCandidate(candidates, {
        family: 'finding',
        normalizedKey: normalizeFindingKey(itemNumber),
        insertOffset,
        line: item.position?.start?.line ?? null,
        anchorStyle: 'inline',
        labelText: `Finding ${itemNumber}`,
      });
    }

    if (headingContext.inOpenQuestions) {
      pushCanonicalCandidate(candidates, {
        family: 'oq',
        normalizedKey: normalizeOqKey(itemNumber),
        insertOffset,
        line: item.position?.start?.line ?? null,
        anchorStyle: 'inline',
        labelText: `OQ ${itemNumber}`,
      });
    }
  });

  return true;
}

function collectTableTargets(node, headingContext, candidates) {
  if (!headingContext.inOpenQuestions || node.children.length <= 1) {
    return false;
  }

  node.children.slice(1).forEach((row) => {
    const firstCellText = normalizeWhitespace(extractVisibleTextFromMdast(row.children?.[0]));
    if (!/^\d+$/.test(firstCellText)) {
      return;
    }

    const insertOffset = row.children?.[0]?.children?.[0]?.position?.start?.offset;
    pushCanonicalCandidate(candidates, {
      family: 'oq',
      normalizedKey: normalizeOqKey(firstCellText),
      insertOffset,
      line: row.position?.start?.line ?? null,
      anchorStyle: 'inline',
      labelText: `OQ ${firstCellText}`,
    });
  });

  return true;
}

function collectParagraphTarget(node, headingContext, candidates) {
  const text = normalizeWhitespace(extractVisibleTextFromMdast(node));
  if (!text) {
    return false;
  }

  if (headingContext.inFindings) {
    const findingMatch = text.match(/^(\d+)\.\s+/);
    if (findingMatch) {
      pushCanonicalCandidate(candidates, {
        family: 'finding',
        normalizedKey: normalizeFindingKey(findingMatch[1]),
        insertOffset: node.position?.start?.offset ?? null,
        line: node.position?.start?.line ?? null,
        anchorStyle: 'block',
        labelText: `Finding ${findingMatch[1]}`,
      });
      return true;
    }
  }

  if (headingContext.inOpenQuestions) {
    const oqMatch = text.match(/^(\d+)\.\s+/);
    if (oqMatch) {
      pushCanonicalCandidate(candidates, {
        family: 'oq',
        normalizedKey: normalizeOqKey(oqMatch[1]),
        insertOffset: node.position?.start?.offset ?? null,
        line: node.position?.start?.line ?? null,
        anchorStyle: 'block',
        labelText: `OQ ${oqMatch[1]}`,
      });
      return true;
    }
  }

  return false;
}

export function collectMarkdownLabelTargets(tree, options = {}) {
  const candidates = [];
  const diagnostics = [];
  const headingStack = [];

  function visit(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'heading') {
      const text = normalizeWhitespace(extractVisibleTextFromMdast(node));
      while (headingStack.length && headingStack[headingStack.length - 1].depth >= node.depth) {
        headingStack.pop();
      }
      headingStack.push({ depth: node.depth, text });

      const headingLabel = matchFindingHeading(text) ?? matchOpenQuestionHeading(text);
      if (headingLabel) {
        pushCanonicalCandidate(candidates, {
          ...headingLabel,
          insertOffset: computeHeadingTailInsertOffset(node),
          line: node.position?.start?.line ?? null,
          anchorStyle: 'heading-tail',
          labelText: stripLeadingSectionEnumeration(text),
        });
      }

      return;
    }

    const headingContext = inferHeadingContext(headingStack);

    if (node.type === 'list') {
      if (collectListTargets(node, headingContext, candidates)) {
        return;
      }
    }

    if (node.type === 'table') {
      if (collectTableTargets(node, headingContext, candidates)) {
        return;
      }
    }

    if (node.type === 'paragraph') {
      if (collectParagraphTarget(node, headingContext, candidates)) {
        return;
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  }

  visit(tree);

  const grouped = new Map();
  candidates.forEach((candidate) => {
    const existing = grouped.get(candidate.normalizedKey) ?? [];
    existing.push(candidate);
    grouped.set(candidate.normalizedKey, existing);
  });

  const targets = [];
  const anchorReplacements = [];

  grouped.forEach((entries, normalizedKey) => {
    if (entries.length > 1) {
      diagnostics.push({
        category: 'ambiguous_canonical_label_definition',
        normalizedKey,
        diagnosticFamily: entries[0]?.family ?? null,
        documentSlug: options.documentSlug ?? null,
        line: entries[0]?.line ?? null,
        candidateTargets: entries.map((entry) => ({
          line: entry.line ?? null,
          labelText: entry.labelText ?? null,
        })),
      });
      return;
    }

    const target = entries[0];
    targets.push(target);
    anchorReplacements.push({
      start: target.insertOffset,
      end: target.insertOffset,
      value: buildMarkdownAnchorInsertion(target.aliasId, target.anchorStyle),
    });
  });

  anchorReplacements.sort((left, right) => right.start - left.start);

  return {
    anchorReplacements,
    diagnostics,
    targets,
  };
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
        labelTargetIndex: options.labelTargetIndex,
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
