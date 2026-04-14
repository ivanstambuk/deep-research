import assert from 'node:assert/strict';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import {
  applyTextReplacements,
  buildSectionTargetIndex,
  collectMarkdownCrossReferenceReplacements,
  linkifyTextValue,
  rewriteHastCrossReferences,
} from './cross-reference-links.js';

function buildIndex(headings) {
  return buildSectionTargetIndex({ headings });
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

  assert.equal(result.changed, false);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].category, 'skipped_external_citation');
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

testLinkifySupportedInternalReference();
testExternalCitationIsSkipped();
testUnsupportedShapesStayPlain();
testExactMatchDoesNotGuessDescendants();
testHastRewriteOnlyLinksInternalReferences();
testMarkdownRewritesRespectExistingFormatting();

console.log('[xref test] cross-reference linker checks passed');
