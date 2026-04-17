import assert from 'node:assert/strict';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import {
  applyTextReplacements,
  buildLabelTargetIndex,
  buildSectionTargetIndex,
  collectLikelyFalsePositiveExternalSkips,
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
  const webauthnResult = linkifyTextValue('The flow waits for confirmation (WebAuthn Level 2, §9.3 — timeout handling).', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0003-authentication-and-session-management',
    },
    targetIndex: buildIndex([{ headingId: '93-internal', text: '9.3 Internal timeout handling' }]),
  });
  const msResult = linkifyTextValue('The PAC structure is defined in MS-PAC, §2 — the authorization-data container.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0003-authentication-and-session-management',
    },
    targetIndex: buildIndex([{ headingId: '2-internal', text: '2 Internal section' }]),
  });
  const oidcResult = linkifyTextValue('OIDC Core §13 / RFC 7523 remains the applicable rule.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0003-authentication-and-session-management',
    },
    targetIndex: buildIndex([{ headingId: '13-internal', text: '13 Internal section' }]),
  });
  const dpdpResult = linkifyTextValue('India (DPDP Act §21 — negative-list approach) imposes localization rules.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0001-mcp-authentication-authorization-agent-identity',
    },
    targetIndex: buildIndex([{ headingId: '21-internal', text: '21 Internal section' }]),
  });
  const parentheticalRfcResult = linkifyTextValue('RFC 9449 (§4) provides the proof syntax.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0003-authentication-and-session-management',
    },
    targetIndex: buildIndex([{ headingId: '4-internal', text: '4 Internal section' }]),
  });

  assert.equal(result.changed, false);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(euResult.changed, false);
  assert.equal(euResult.diagnostics.length, 1);
  assert.equal(euResult.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(webauthnResult.changed, false);
  assert.equal(webauthnResult.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(msResult.changed, false);
  assert.equal(msResult.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(oidcResult.changed, false);
  assert.equal(oidcResult.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(dpdpResult.changed, false);
  assert.equal(dpdpResult.diagnostics[0].category, 'skipped_external_citation');
  assert.equal(parentheticalRfcResult.changed, false);
  assert.equal(parentheticalRfcResult.diagnostics[0].category, 'skipped_external_citation');
}

function testEarlierProtocolMentionsDoNotSuppressInternalSectionLinks() {
  const targetIndex = buildIndex([
    {
      headingId: '1673-same-user-binding-how-rps-guarantee-pseudonymattribute-continuity',
      text: '16.7.3 Same-User Binding: How RPs Guarantee Pseudonym–Attribute Continuity',
    },
  ]);

  const findingResult = linkifyTextValue(
    'Same-user binding across WebAuthn and OpenID4VP is solvable today, but imperfectly. Session-based binding (§16.7.3, Strategies 1–3) provides reasonable assurance for same-device flows.',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );
  const challengeEmbeddingResult = linkifyTextValue(
    'The RP sets the OpenID4VP nonce parameter to include the original WebAuthn challenge (or a derivative), creating a cross-ceremony binding (§16.7.3, Strategy 2: Challenge Embedding).',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );

  assert.equal(findingResult.changed, true);
  assert.equal(findingResult.diagnostics.length, 0);
  assert.equal(
    findingResult.parts.some((part) => part.type === 'link' && part.href === '#1673-same-user-binding-how-rps-guarantee-pseudonymattribute-continuity'),
    true,
  );

  assert.equal(challengeEmbeddingResult.changed, true);
  assert.equal(challengeEmbeddingResult.diagnostics.length, 0);
  assert.equal(
    challengeEmbeddingResult.parts.some((part) => part.type === 'link' && part.href === '#1673-same-user-binding-how-rps-guarantee-pseudonymattribute-continuity'),
    true,
  );
}

function testInternalCueOverridesExternalCitationSkip() {
  const targetIndex = buildIndex([
    { headingId: '35-token-introspection-and-revocation', text: '3.5 Token Introspection and Revocation' },
    { headingId: '411-oauth-21-and-fapi', text: '4.1 OAuth 2.1 Consolidation and FAPI 2.0 Security Profile' },
    { headingId: '2174-rp-response-playbook', text: '21.7.4 RP Response Playbook' },
    { headingId: '29-openid4vp', text: '29 OpenID4VP and OpenID4VCI Verifiable Credential Presentation and Issuance' },
    { headingId: '16-pseudonym-based-authentication-and-webauthn', text: '16 Pseudonym-Based Authentication and WebAuthn' },
  ]);

  const rfcWithInternalCue = linkifyTextValue(
    "The resource server must call the authorization server's token introspection endpoint (RFC 7662, see §3.5) to validate the token.",
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0003-authentication-and-session-management',
      },
      targetIndex,
    },
  );
  const coveredInDetailCue = linkifyTextValue(
    'FAPI 2.0 is covered in detail in §4.1.',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0003-authentication-and-session-management',
      },
      targetIndex,
    },
  );
  const sentenceInitialCue = linkifyTextValue(
    'No implementation guidance exists beyond the regulation text. §21.7.4 provides a recommended response playbook based on the regulatory requirements.',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );
  const topicParentheticalCue = linkifyTextValue(
    'OpenID4VP (§29) provides the presentation protocol layer that makes these privacy-preserving credentials usable at scale.',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0003-authentication-and-session-management',
      },
      targetIndex,
    },
  );
  const documentSlugCue = linkifyTextValue(
    'DR-0002 §16 covers the WebAuthn-based pseudonym mechanism that HAIP recommends.',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );

  assert.equal(rfcWithInternalCue.changed, true);
  assert.equal(rfcWithInternalCue.diagnostics.length, 0);
  assert.equal(rfcWithInternalCue.parts.some((part) => part.type === 'link' && part.href === '#35-token-introspection-and-revocation'), true);

  assert.equal(coveredInDetailCue.changed, true);
  assert.equal(coveredInDetailCue.diagnostics.length, 0);
  assert.equal(coveredInDetailCue.parts.some((part) => part.type === 'link' && part.href === '#411-oauth-21-and-fapi'), true);

  assert.equal(sentenceInitialCue.changed, true);
  assert.equal(sentenceInitialCue.diagnostics.length, 0);
  assert.equal(sentenceInitialCue.parts.some((part) => part.type === 'link' && part.href === '#2174-rp-response-playbook'), true);

  assert.equal(topicParentheticalCue.changed, true);
  assert.equal(topicParentheticalCue.diagnostics.length, 0);
  assert.equal(topicParentheticalCue.parts.some((part) => part.type === 'link' && part.href === '#29-openid4vp'), true);

  assert.equal(documentSlugCue.changed, true);
  assert.equal(documentSlugCue.diagnostics.length, 0);
  assert.equal(documentSlugCue.parts.some((part) => part.type === 'link' && part.href === '#16-pseudonym-based-authentication-and-webauthn'), true);
}

function testUnsupportedShapesStayPlain() {
  const targetIndex = buildIndex([
    { headingId: '5-section', text: '5 Section' },
    { headingId: '6-section', text: '6 Section' },
    { headingId: '231-section', text: '23.1 Section' },
    { headingId: '10-section', text: '10 Section' },
    { headingId: '164312-security', text: '164.312 Security' },
  ]);

  const rangeResult = linkifyTextValue('See §5–§6.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex,
  });
  const shorthandRangeResult = linkifyTextValue('See §23.1–24.4 and §10–12.', {
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
  assert.equal(shorthandRangeResult.changed, false);
  assert.equal(shorthandRangeResult.diagnostics.length, 2);
  assert.equal(shorthandRangeResult.diagnostics[0].category, 'skipped_unsupported_xref_shape');
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

function testDashPunctuationReferencesLinkNormally() {
  const targetIndex = buildIndex([
    { headingId: '1032-dc-api-vs-legacy-uri-scheme-fallback', text: '10.3.2 DC API vs. Legacy URI Scheme Fallback' },
    { headingId: '11123-ambiguity-handling-policy', text: '11.12.3 Ambiguity Handling Policy' },
  ]);

  const leadingDashResult = linkifyTextValue(
    'Fallback flows have higher residual risk — §10.3.2 details the compensating controls.',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );
  const trailingDashResult = linkifyTextValue(
    'Apply the ambiguity handling policy (§11.12.3 — deny by default for high-value flows).',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );

  assert.equal(leadingDashResult.changed, true);
  assert.equal(leadingDashResult.diagnostics.length, 0);
  assert.equal(leadingDashResult.parts.some((part) => part.type === 'link' && part.href === '#1032-dc-api-vs-legacy-uri-scheme-fallback'), true);

  assert.equal(trailingDashResult.changed, true);
  assert.equal(trailingDashResult.diagnostics.length, 0);
  assert.equal(trailingDashResult.parts.some((part) => part.type === 'link' && part.href === '#11123-ambiguity-handling-policy'), true);
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

function testLikelyFalsePositiveExternalSkipReport() {
  const targetIndex = buildIndex([
    { headingId: '2110-identity-chaining', text: '21.10 Identity Chaining' },
    { headingId: '5-direct-token-exchange', text: '5 Direct Token Exchange' },
    { headingId: '231-spec-compliance', text: '23.1 Gateway Spec Compliance Matrix' },
  ]);
  const diagnostics = [
    {
      category: 'skipped_external_citation',
      tokenText: '§21.10',
      referenceValue: '21.10',
      snippet: 'Authorization Chaining Across Domains specification (draft-ietf-oauth-identity-chaining-08, see §21.10). The protocol enables MCP clients to chain identity.',
    },
    {
      category: 'skipped_external_citation',
      tokenText: '§5',
      referenceValue: '5',
      snippet: 'Pattern A (Direct Token Exchange) is the RFC 8693 model from §5, viewed from the credential delegation perspective.',
    },
    {
      category: 'skipped_external_citation',
      tokenText: '§5.1',
      referenceValue: '5.1',
      snippet: 'RFC 6750 §5.1 defines the insufficient_scope error.',
    },
  ];

  const result = collectLikelyFalsePositiveExternalSkips({
    diagnostics,
    targetIndex,
  });

  assert.deepEqual(
    result.map((entry) => ({ referenceValue: entry.referenceValue, headingId: entry.headingId })),
    [
      { referenceValue: '21.10', headingId: '2110-identity-chaining' },
      { referenceValue: '5', headingId: '5-direct-token-exchange' },
    ],
  );
}

testLinkifySupportedInternalReference();
testExternalCitationIsSkipped();
testEarlierProtocolMentionsDoNotSuppressInternalSectionLinks();
testInternalCueOverridesExternalCitationSkip();
testUnsupportedShapesStayPlain();
testExactMatchDoesNotGuessDescendants();
testDashPunctuationReferencesLinkNormally();
testHastRewriteOnlyLinksInternalReferences();
testMarkdownRewritesRespectExistingFormatting();
testLabelLinkifySupportsFindingAndOqReferences();
testMarkdownLabelTargetsCoverListsTablesAndParagraphs();
testHeadingBackedLabelAnchorsStayAfterHeadingLine();
testMarkdownCrossReferencesSupportLabels();
testLikelyFalsePositiveExternalSkipReport();

console.log('[xref test] cross-reference linker checks passed');
