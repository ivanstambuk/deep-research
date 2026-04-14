import assert from 'node:assert/strict';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import {
  applyTextReplacements,
  buildLabelTargetIndex,
  buildSectionTargetIndex,
  collectMarkdownLabelTargets,
  collectMarkdownCrossReferenceReplacements,
  linkifyTextValue,
  rewriteHastCrossReferences,
} from './cross-reference-links.js';

function buildIndex(headings) {
  return buildSectionTargetIndex({ headings });
}

function buildLabelIndex(targets) {
  return buildLabelTargetIndex({ targets });
}

function testLinkifySupportedInternalReference() {
  const targetIndex = buildIndex([
    {
      chapterId: '5-trust-infrastructure-certificates-attestations-and-trusted-lists',
      headingId: '522-wrpac-structure',
      slug: 'DR-0002-eudi-wallet-relying-party-integration',
      text: '5.2.2 WRPAC structure',
    },
  ]);

  const result = linkifyTextValue('See §5.2.2 for details.', {
    buildHref: (target) => `/${target.slug}/${target.chapterId}#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex,
  });

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.parts, [
    { type: 'text', value: 'See ' },
    {
      type: 'link',
      href: '/DR-0002-eudi-wallet-relying-party-integration/5-trust-infrastructure-certificates-attestations-and-trusted-lists#522-wrpac-structure',
      text: '§5.2.2',
      target: targetIndex.get('5.2.2')[0],
    },
    { type: 'text', value: ' for details.' },
  ]);
}

function testExternalCitationIsSkipped() {
  const result = linkifyTextValue('RFC 9449 §4 defines the header.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const euResult = linkifyTextValue('Commission Implementing Regulation (EU) 2021/1042, §10 defines the EUID.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });

  assert.equal(result.changed, false);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(euResult.changed, false);
  assert.equal(euResult.diagnostics.length, 1);
  assert.equal(euResult.diagnostics[0].category, 'skipped_external_citation');
}

function testUnsupportedShapesStayPlain() {
  const targetIndex = buildIndex([
    { headingId: '5-section', text: '5 Section' },
    { headingId: '6-section', text: '6 Section' },
    { headingId: '164312-security', text: '164.312 Security' },
  ]);

  const rangeResult = linkifyTextValue('See §5–§6.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex,
  });
  const legalResult = linkifyTextValue('HIPAA §164.312(b) applies here.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex,
  });

  assert.equal(rangeResult.changed, false);
  assert.equal(rangeResult.diagnostics.length, 2);
  assert.equal(rangeResult.diagnostics[0].category, 'skipped_unsupported_xref_shape');
  assert.equal(legalResult.changed, false);
  assert.equal(legalResult.diagnostics[0].category, 'skipped_unsupported_xref_shape');
}

function testExactMatchDoesNotGuessDescendants() {
  const result = linkifyTextValue('See §29.2.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '2923-wrpac-private-key-compromise', text: '29.2.3 WRPAC Private Key Compromise' },
    ]),
  });

  assert.equal(result.changed, false);
  assert.equal(result.diagnostics[0].category, 'unresolved_internal_xref');
}

function testHastRewriteOnlyLinksInternalReferences() {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          { type: 'text', value: 'See §5.2.2 and RFC 9449 §4.' },
        ],
      },
    ],
  };

  const diagnostics = rewriteHastCrossReferences(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    slug: 'DR-0002-eudi-wallet-relying-party-integration',
    targetIndex: buildIndex([
      {
        chapterId: '5-trust-infrastructure-certificates-attestations-and-trusted-lists',
        headingId: '522-wrpac-structure',
        slug: 'DR-0002-eudi-wallet-relying-party-integration',
        text: '5.2.2 WRPAC structure',
      },
    ]),
  });

  const paragraphChildren = tree.children[0].children;
  assert.equal(paragraphChildren[1].tagName, 'a');
  assert.equal(paragraphChildren[1].properties.href, '/DR-0002-eudi-wallet-relying-party-integration/5-trust-infrastructure-certificates-attestations-and-trusted-lists#522-wrpac-structure');
  assert.equal(paragraphChildren.slice(2).map((node) => node.value ?? '').join(''), ' and RFC 9449 §4.');
  assert.equal(diagnostics.some((entry) => entry.category === 'skipped_external_citation'), true);
}

function testMarkdownRewritesRespectExistingFormatting() {
  const source = 'See **§5.2.2** and `§31.2`.\n';
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const targetIndex = buildIndex([
    { headingId: '522-wrpac-structure', text: '5.2.2 WRPAC structure' },
    { headingId: '312-alert-triggers', text: '31.2 Alert triggers' },
  ]);
  const result = collectMarkdownCrossReferenceReplacements(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex,
  });
  const linked = applyTextReplacements(source, result.replacements);

  assert.equal(linked, 'See **[§5.2.2](#522-wrpac-structure)** and `§31.2`.\n');
}

function testLabelLinkifySupportsFindingAndOqReferences() {
  const labelTargetIndex = buildLabelIndex([
    {
      chapterId: '26-key-findings',
      headingId: 'finding-26',
      slug: 'DR-0001-mcp-authentication-authorization-agent-identity',
      normalizedKey: 'finding-26',
      labelText: 'Key Finding 26',
    },
    {
      chapterId: '36-open-questions',
      headingId: 'oq-10',
      slug: 'DR-0002-eudi-wallet-relying-party-integration',
      normalizedKey: 'oq-10',
      labelText: 'OQ 10',
    },
  ]);

  const result = linkifyTextValue('Finding 26 and OQ #10 remain open.', {
    buildHref: (target) => `/${target.slug}/${target.chapterId}#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0001-mcp-authentication-authorization-agent-identity',
    },
    targetIndex: buildIndex([]),
    labelTargetIndex,
  });

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  const links = result.parts.filter((part) => part.type === 'link');
  assert.equal(links[0].href, '/DR-0001-mcp-authentication-authorization-agent-identity/26-key-findings#finding-26');
  assert.equal(links[1].href, '/DR-0002-eudi-wallet-relying-party-integration/36-open-questions#oq-10');
}

function testMarkdownLabelTargetsCoverListsTablesAndParagraphs() {
  const source = [
    '## Findings',
    '',
    '2. List-backed finding definition',
    '',
    '## 28. Open Questions',
    '',
    '15. **Provider vs. Deployer classification in MCP architectures**',
    '',
    '### 36. Open Questions',
    '',
    '| # | Question |',
    '|:-:|:---------|',
    '| 10 | Cryptographic binding mechanism |',
    '',
    '## Findings',
    '',
    '**3. Paragraph-backed finding definition**',
    '',
  ].join('\n');

  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownLabelTargets(tree, {
    documentSlug: 'synthetic-doc',
  });
  const linked = applyTextReplacements(source, result.anchorReplacements);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.targets.some((target) => target.normalizedKey === 'finding-2'), true);
  assert.equal(result.targets.some((target) => target.normalizedKey === 'finding-3'), true);
  assert.equal(result.targets.some((target) => target.normalizedKey === 'oq-15'), true);
  assert.equal(result.targets.some((target) => target.normalizedKey === 'oq-10'), true);
  assert.equal(linked.includes('<a id="oq-15"></a>'), true);
  assert.equal(linked.includes('<a id="oq-10"></a>'), true);
  assert.equal(linked.includes('<a id="finding-2"></a>'), true);
  assert.equal(linked.includes('<a id="finding-3"></a>'), true);
}

function testHeadingBackedLabelAnchorsStayAfterHeadingLine() {
  const source = [
    '---',
    '',
    '### F1. Heading-backed finding definition',
    '',
  ].join('\n');

  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownLabelTargets(tree, {
    documentSlug: 'synthetic-doc',
  });
  const linked = applyTextReplacements(source, result.anchorReplacements);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(linked.includes('<a id="finding-f-1"></a>\n###'), false);
  assert.equal(linked.includes('### F1. Heading-backed finding definition\n<a id="finding-f-1"></a>'), true);
}

function testMarkdownCrossReferencesSupportLabels() {
  const source = 'See Finding 2 and OQ-9, but keep `OQ1` plain in code.\n';
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownCrossReferenceReplacements(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0004-agentic-harnesses',
    },
    targetIndex: buildIndex([]),
    labelTargetIndex: buildLabelIndex([
      {
        headingId: 'finding-2',
        normalizedKey: 'finding-2',
        labelText: 'Finding 2',
      },
      {
        headingId: 'oq-9',
        normalizedKey: 'oq-9',
        labelText: 'OQ 9',
      },
    ]),
  });
  const linked = applyTextReplacements(source, result.replacements);

  assert.equal(linked, 'See [Finding 2](#finding-2) and [OQ-9](#oq-9), but keep `OQ1` plain in code.\n');
}

testLinkifySupportedInternalReference();
testExternalCitationIsSkipped();
testUnsupportedShapesStayPlain();
testExactMatchDoesNotGuessDescendants();
testHastRewriteOnlyLinksInternalReferences();
testMarkdownRewritesRespectExistingFormatting();
testLabelLinkifySupportsFindingAndOqReferences();
testMarkdownLabelTargetsCoverListsTablesAndParagraphs();
testHeadingBackedLabelAnchorsStayAfterHeadingLine();
testMarkdownCrossReferencesSupportLabels();

console.log('[xref test] cross-reference linker checks passed');
