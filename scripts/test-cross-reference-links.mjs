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

function testArfReferencesResolveAsExternalLinks() {
  const result = linkifyTextValue('ARF §6.6.3.11 and ARF §6.6.3.12 sharpen the trust boundary.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '66311-internal', text: '6.6.3.11 Internal section' },
      { headingId: '66312-internal', text: '6.6.3.12 Internal section' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(links.length, 2);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#66311-relying-party-instance-trusts-issuer-to-have-authenticated-the-wallet-unit-and-the-wallet-provider',
  );
  assert.equal(
    links[1].href,
    'https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#66312-relying-party-optionally-trusts-issuer-to-regularly-verify-that-wallet-unit-is-not-revoked',
  );
  assert.equal(links[0].target.linkKind, 'external');
  assert.equal(links[1].target.linkKind, 'external');
}

function testArfSuffixCueResolvesExternalLinks() {
  const result = linkifyTextValue('This will be clarified in §6.1 of the ARF.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '61-local', text: '6.1 Local section' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(links.length, 1);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#61-scope',
  );
  assert.equal(links[0].target.linkKind, 'external');
}

function testArfAnnexTopicReferencesResolveAsExternalLinks() {
  const result = linkifyTextValue('ARF Topic 52 constrains intermediary layering.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '52-local', text: '52 Local section' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(links.length, 1);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a2330-topic-52-relying-party-intermediaries',
  );
  assert.equal(links[0].text, 'ARF Topic 52');
  assert.equal(links[0].target.linkKind, 'external');
  assert.equal(links[0].target.topicKind, 'annex');

  const topic6Result = linkifyTextValue('ARF Topic 6 defines RP authentication.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const topic6Links = topic6Result.parts.filter((part) => part.type === 'link');
  assert.equal(topic6Result.diagnostics.length, 0);
  assert.equal(topic6Links.length, 1);
  assert.equal(
    topic6Links[0].href,
    'https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a234-topic-6-relying-party-authentication-and-user-approval',
  );
}

function testArfDiscussionTopicReferencesResolveAsExternalLinks() {
  const result = linkifyTextValue('ARF Topic K defines cryptographic binding guidance.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: 'k-local', text: 'Topic K Local section' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(links.length, 1);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/discussion-topics/k-combined-presentation-of-attestations/',
  );
  assert.equal(links[0].text, 'ARF Topic K');
  assert.equal(links[0].target.linkKind, 'external');
  assert.equal(links[0].target.topicKind, 'discussion');
}

function testBareArfTopicReferencesResolveForDr0002Only() {
  const annexResult = linkifyTextValue('Topic 1 `OIA_08` defines the DC API boundary.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const discussionResult = linkifyTextValue('CTAP-Hybrid is permitted only if Topic F expectations are met.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const annexPrefixResult = linkifyTextValue('Annex Topic 18 defines current HLRs.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const otherDocumentResult = linkifyTextValue('Topic 1 introduces the local subject.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0003-authentication-and-session-management',
    },
    targetIndex: buildIndex([]),
  });
  const compoundResult = linkifyTextValue('Historical Topic A/B background remains useful.', {
    buildHref: () => '#should-not-link',
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });

  const annexLinks = annexResult.parts.filter((part) => part.type === 'link');
  assert.equal(annexResult.changed, true);
  assert.equal(annexResult.diagnostics.length, 0);
  assert.equal(annexLinks.length, 1);
  assert.equal(annexLinks[0].text, 'Topic 1');
  assert.equal(
    annexLinks[0].href,
    'https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a231-topic-1-accessing-online-services-with-a-wallet-unit',
  );
  assert.equal(annexLinks[0].target.topicKind, 'annex');

  const discussionLinks = discussionResult.parts.filter((part) => part.type === 'link');
  assert.equal(discussionResult.changed, true);
  assert.equal(discussionResult.diagnostics.length, 0);
  assert.equal(discussionLinks.length, 1);
  assert.equal(discussionLinks[0].text, 'Topic F');
  assert.equal(
    discussionLinks[0].href,
    'https://eudi.dev/2.8.0/discussion-topics/f-digital-credential-api/',
  );
  assert.equal(discussionLinks[0].target.topicKind, 'discussion');

  const annexPrefixLinks = annexPrefixResult.parts.filter((part) => part.type === 'link');
  assert.equal(annexPrefixResult.changed, true);
  assert.equal(annexPrefixResult.diagnostics.length, 0);
  assert.equal(annexPrefixLinks.length, 1);
  assert.equal(annexPrefixLinks[0].text, 'Annex Topic 18');
  assert.equal(
    annexPrefixLinks[0].href,
    'https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a2311-topic-18-combined-presentations-of-attributes',
  );
  assert.equal(annexPrefixLinks[0].target.topicKind, 'annex');

  assert.equal(otherDocumentResult.changed, false);
  assert.equal(otherDocumentResult.diagnostics.length, 0);
  assert.equal(compoundResult.changed, false);
  assert.equal(compoundResult.diagnostics.length, 0);
}

function testArfTopicSubsectionsDoNotResolveImplicitly() {
  const result = linkifyTextValue('ARF Topic A §5.3 recommends herd-privacy protections.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '53-local', text: '5.3 Local section' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(links.length, 1);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/discussion-topics/a-privacy-risks-and-mitigations/',
  );
  assert.equal(links[0].text, 'ARF Topic A');
  assert.equal(result.parts.some((part) => part.type === 'text' && part.value.includes('§5.3')), true);
}

function testArfTopicMentionsDoNotBlockLaterInternalSections() {
  const result = linkifyTextValue('The ARF Topic A analysis matters; see §11.9 for the trust model.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '119-trust-model', text: '11.9 Trust model' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(links.length, 2);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/discussion-topics/a-privacy-risks-and-mitigations/',
  );
  assert.equal(links[0].text, 'ARF Topic A');
  assert.equal(links[1].href, '#119-trust-model');
  assert.equal(links[1].text, '§11.9');
}

function testArfCarryForwardDoesNotResolveBareSections() {
  const result = linkifyTextValue('The rationale, as documented in ARF §5.2.3, §7.1, and the GitHub issue.', {
    buildHref: (target) => `#${target.headingId}`,
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '523-local', text: '5.2.3 Local section' },
      { headingId: '71-local', text: '7.1 Local section' },
    ]),
  });

  const links = result.parts.filter((part) => part.type === 'link');

  assert.equal(result.changed, true);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].category, 'skipped_implicit_arf_reference');
  assert.equal(links.length, 1);
  assert.equal(
    links[0].href,
    'https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#523-qualified-electronic-attestation-of-attributes-qeaa',
  );
  assert.equal(links[0].text, '§5.2.3');
  assert.equal(result.parts.some((part) => part.type === 'text' && part.value.includes('§7.1')), true);
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

function testTargetHeadingCueOverridesExternalCitationSkip() {
  const targetIndex = buildIndex([
    { headingId: '2665-callback-payload-requirements', text: '26.6.5 Callback Payload Requirements' },
    { headingId: '2661-integration-models-and-callback-layers', text: '26.6.1 Integration Models and Callback Layers' },
    { headingId: '2664-reverse-proxy-integration-pattern', text: '26.6.4 Reverse-Proxy Integration Pattern' },
  ]);

  const chainedInternalRefs = linkifyTextValue(
    'The preceding sections describe callback architecture in terms of what is delivered (§26.6.5 payload specification), who delivers it (§26.6.1 integration models A–E), and how a reverse-proxy deployment can be implemented (§26.6.4).',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );
  const modelLabelCue = linkifyTextValue(
    'RPs targeting cross-browser coverage must implement a dual-protocol backend or fall back to Universal Links for Safari-based OID4VP flows (Model D, §26.6.1).',
    {
      buildHref: (target) => `#${target.headingId}`,
      diagnosticBase: {
        documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
      },
      targetIndex,
    },
  );

  assert.equal(chainedInternalRefs.changed, true);
  assert.equal(chainedInternalRefs.diagnostics.length, 0);
  assert.equal(
    chainedInternalRefs.parts.filter((part) => part.type === 'link').map((part) => part.href).join(','),
    '#2665-callback-payload-requirements,#2661-integration-models-and-callback-layers,#2664-reverse-proxy-integration-pattern',
  );

  assert.equal(modelLabelCue.changed, true);
  assert.equal(modelLabelCue.diagnostics.length, 0);
  assert.equal(
    modelLabelCue.parts.some((part) => part.type === 'link' && part.href === '#2661-integration-models-and-callback-layers'),
    true,
  );
}

function testSectionRangesLinkFirstEndpointOnly() {
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
  const externalRangeResult = linkifyTextValue('OpenID Connect Client-Initiated Backchannel Authentication (CIBA) Core 1.0 (§10–12):', {
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

  assert.equal(rangeResult.changed, true);
  assert.equal(rangeResult.diagnostics.length, 0);
  assert.deepEqual(
    rangeResult.parts.map((part) => part.type === 'link' ? `[${part.text}](${part.href})` : part.value),
    ['See ', '[§5](#5-section)', '–§6', '.'],
  );

  assert.equal(shorthandRangeResult.changed, true);
  assert.equal(shorthandRangeResult.diagnostics.length, 0);
  assert.deepEqual(
    shorthandRangeResult.parts.map((part) => part.type === 'link' ? `[${part.text}](${part.href})` : part.value),
    ['See ', '[§23.1](#231-section)', '–24.4', ' and ', '[§10](#10-section)', '–12', '.'],
  );

  assert.equal(externalRangeResult.changed, false);
  assert.equal(externalRangeResult.diagnostics.length, 1);
  assert.equal(externalRangeResult.diagnostics[0].category, 'skipped_external_citation');
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

function testHastRewriteSupportsArfExternalReferences() {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        children: [
          { type: 'text', value: 'See ARF §2.6.6.2 for the use case description.' },
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
        chapterId: '2-internal',
        headingId: '2662-local',
        slug: 'DR-0002-eudi-wallet-relying-party-integration',
        text: '2.6.6.2 Local section',
      },
    ]),
  });

  const paragraphChildren = tree.children[0].children;
  assert.equal(diagnostics.length, 0);
  assert.equal(paragraphChildren[1].tagName, 'a');
  assert.equal(
    paragraphChildren[1].properties.href,
    'https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#2662-educational-attestations-and-professional-qualifications',
  );
  assert.equal(paragraphChildren[1].properties['data-doc-xref'], undefined);
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

function testMarkdownRewritesSupportExplicitArfReferences() {
  const source = 'The rationale, as documented in ARF §5.2.3 and ARF §7.1, and the GitHub issue.\n';
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownCrossReferenceReplacements(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '523-local', text: '5.2.3 Local section' },
      { headingId: '71-local', text: '7.1 Local section' },
    ]),
  });
  const linked = applyTextReplacements(source, result.replacements);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(
    linked,
    'The rationale, as documented in ARF [§5.2.3](https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#523-qualified-electronic-attestation-of-attributes-qeaa) and ARF [§7.1](https://eudi.dev/2.8.0/architecture-and-reference-framework-main/#71-introduction), and the GitHub issue.\n',
  );
}

function testMarkdownRewritesSupportExplicitArfTopicReferences() {
  const source = 'The intermediary rules are defined in ARF Topic 52, while binding guidance lives in ARF Topic K.\n';
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownCrossReferenceReplacements(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const linked = applyTextReplacements(source, result.replacements);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(
    linked,
    'The intermediary rules are defined in [ARF Topic 52](https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a2330-topic-52-relying-party-intermediaries), while binding guidance lives in [ARF Topic K](https://eudi.dev/2.8.0/discussion-topics/k-combined-presentation-of-attestations/).\n',
  );
}

function testMarkdownRewritesSupportBareArfTopicReferencesForDr0002() {
  const source = 'The boundary follows Topic 1 and Topic F, while Annex Topic 18 remains future work.\n';
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownCrossReferenceReplacements(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([]),
  });
  const linked = applyTextReplacements(source, result.replacements);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(
    linked,
    'The boundary follows [Topic 1](https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a231-topic-1-accessing-online-services-with-a-wallet-unit) and [Topic F](https://eudi.dev/2.8.0/discussion-topics/f-digital-credential-api/), while [Annex Topic 18](https://eudi.dev/2.8.0/annexes/annex-2/annex-2.02-high-level-requirements-by-topic/#a2311-topic-18-combined-presentations-of-attributes) remains future work.\n',
  );
}

function testMarkdownRewritesSupportSectionRanges() {
  const source = 'Use **§8–§11** for remote flows and §34–§35 for conclusions.\n';
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(source);
  const result = collectMarkdownCrossReferenceReplacements(tree, {
    diagnosticBase: {
      documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    },
    targetIndex: buildIndex([
      { headingId: '8-openid4vp', text: '8 OpenID4VP' },
      { headingId: '34-findings', text: '34 Findings' },
    ]),
  });
  const linked = applyTextReplacements(source, result.replacements);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(
    linked,
    'Use **[§8](#8-openid4vp)–§11** for remote flows and [§34](#34-findings)–§35 for conclusions.\n',
  );
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
testArfReferencesResolveAsExternalLinks();
testArfSuffixCueResolvesExternalLinks();
testArfAnnexTopicReferencesResolveAsExternalLinks();
testArfDiscussionTopicReferencesResolveAsExternalLinks();
testBareArfTopicReferencesResolveForDr0002Only();
testArfTopicSubsectionsDoNotResolveImplicitly();
testArfTopicMentionsDoNotBlockLaterInternalSections();
testArfCarryForwardDoesNotResolveBareSections();
testEarlierProtocolMentionsDoNotSuppressInternalSectionLinks();
testInternalCueOverridesExternalCitationSkip();
testTargetHeadingCueOverridesExternalCitationSkip();
testSectionRangesLinkFirstEndpointOnly();
testExactMatchDoesNotGuessDescendants();
testDashPunctuationReferencesLinkNormally();
testHastRewriteOnlyLinksInternalReferences();
testHastRewriteSupportsArfExternalReferences();
testMarkdownRewritesRespectExistingFormatting();
testMarkdownRewritesSupportExplicitArfReferences();
testMarkdownRewritesSupportExplicitArfTopicReferences();
testMarkdownRewritesSupportBareArfTopicReferencesForDr0002();
testMarkdownRewritesSupportSectionRanges();
testLabelLinkifySupportsFindingAndOqReferences();
testMarkdownLabelTargetsCoverListsTablesAndParagraphs();
testHeadingBackedLabelAnchorsStayAfterHeadingLine();
testMarkdownCrossReferencesSupportLabels();
testLikelyFalsePositiveExternalSkipReport();

console.log('[xref test] cross-reference linker checks passed');
