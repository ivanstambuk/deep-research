const DR_0001_SLUG = 'DR-0001-mcp-authentication-authorization-agent-identity';

const DR_0001_CHAPTER_MIGRATIONS = {
  '1-current-mcp-authorization-and-protocol-baseline':
    '2-mcp-authorization-bootstrap-client-trust-and-grant-profiles',
  '2-stateless-streamable-http-authorization':
    '3-request-scoped-authorization-and-downstream-execution',
  '3-scope-and-client-identity-lifecycle':
    '4-scope-selection-and-runtime-step-up',
  context:
    'context-and-scope',
  scope:
    'context-and-scope',
  '1-mcp-authorization-bootstrap-client-trust-and-grant-profiles':
    '2-mcp-authorization-bootstrap-client-trust-and-grant-profiles',
  '2-request-scoped-authorization-and-downstream-execution':
    '3-request-scoped-authorization-and-downstream-execution',
  '3-scope-selection-and-runtime-step-up':
    '4-scope-selection-and-runtime-step-up',
  '4-choosing-the-authority-relationship':
    '5-choosing-the-authority-relationship',
  '5-oauth-token-exchange-rfc-8693-and-delegated-derivation':
    '6-oauth-token-exchange-rfc-8693-and-delegated-derivation',
  '6-agent-identity-vs-user-identity':
    '7-agent-identity-vs-user-identity',
  '7-agent-definition-identity-and-governance-lifecycles':
    '8-agent-definition-identity-and-governance-lifecycles',
  '8-a2a-protocol-and-ap2-agent-to-agent-authentication-and-payment-patterns':
    '9-a2a-protocol-and-ap2-agent-to-agent-authentication-and-payment-patterns',
  '9-authorization-context-and-delegation-representation':
    '10-authorization-context-and-delegation-representation',
  '10-authorization-continuity-and-durable-tasks':
    '11-authorization-continuity-and-durable-tasks',
  '11-credential-custody-and-release-patterns':
    '12-credential-custody-and-release-patterns',
  '12-credential-state-revocation-and-termination-convergence':
    '13-credential-state-revocation-and-termination-convergence',
  '13-gateway-mediated-mcp-architecture':
    '14-gateway-mediated-mcp-architecture',
  '14-authorization-approval-and-consent-models':
    '15-authorization-approval-and-consent-models',
  '15-human-oversight-architecture':
    '16-human-oversight-architecture',
  '16-task-based-access-control-tbac':
    '17-task-based-access-control-tbac',
  '17-authorization-across-mcp-primitives-and-durable-state':
    '18-authorization-across-mcp-primitives-and-durable-state',
  '18-authorization-models-and-policy-engines-pattern-synthesis':
    '19-authorization-models-and-policy-engines-pattern-synthesis',
  '19-rich-authorization-requests-rar-vs-oauth-scopes':
    '20-rich-authorization-requests-rar-vs-oauth-scopes',
  '20-emerging-standards-for-ai-agent-authorization':
    '21-emerging-standards-for-ai-agent-authorization',
  '21-product-implementation-landscape':
    '22-product-implementation-landscape',
  '22-consolidated-comparison-thirteen-architectural-models':
    '23-consolidated-comparison-thirteen-architectural-models',
  '23-eu-ai-act-and-adjacent-eu-obligations-applicability-controls-and-evidence':
    '24-eu-ai-act-and-adjacent-eu-obligations-applicability-controls-and-evidence',
  '24-usnist-and-cross-jurisdiction-governance-authority-evidence-and-assurance':
    '25-usnist-and-cross-jurisdiction-governance-authority-evidence-and-assurance',
  '25-findings':
    '26-findings',
  '26-recommendations':
    '27-recommendations',
  '27-open-questions':
    '28-open-questions',
};

const DR_0001_HEADING_MIGRATIONS = {
  context: {
    context:
      ['context-and-scope', 'context-and-scope'],
    'defining-the-mcp-gateway':
      ['1-mcp-ecosystem-actors-and-authorization-mental-model', '12-ecosystem-and-control-plane-actors'],
  },
  scope: {
    scope:
      ['context-and-scope', 'context-and-scope'],
  },
  '1-current-mcp-authorization-and-protocol-baseline': {
    '1-current-mcp-authorization-and-protocol-baseline':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '2-mcp-authorization-bootstrap-client-trust-and-grant-profiles'],
    '11-current-only-protocol-admission':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '21-current-only-protocol-admission'],
    '12-authorization-trust-chain':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '22-trust-boundaries-and-authorization-artifacts'],
    '13-client-registration-and-enterprise-governance':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '23-pre-registration-and-client-id-metadata-documents-cimd'],
    '131-client-id-metadata-documents-cimd':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '23-pre-registration-and-client-id-metadata-documents-cimd'],
    '132-enterprise-managed-authorization-identity-assertion-grant-protocol':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '26-enterprise-managed-authorization-alternative-grant-profile'],
    '14-layered-failure-taxonomy':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '29-layered-failure-and-recovery-taxonomy'],
    '15-solved-authorization-bootstrap':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '25-canonical-interactive-mcp-oauth-bootstrap'],
  },
  '2-stateless-streamable-http-authorization': {
    '2-stateless-streamable-http-authorization':
      ['3-request-scoped-authorization-and-downstream-execution', '3-request-scoped-authorization-and-downstream-execution'],
    '21-current-transport-contract':
      ['3-request-scoped-authorization-and-downstream-execution', '31-request-contract-and-enforcement-ownership'],
    '22-request-security-and-explicit-application-state':
      ['3-request-scoped-authorization-and-downstream-execution', '32-explicit-application-state-and-result-boundaries'],
    '23-gateway-and-server-enforcement':
      ['3-request-scoped-authorization-and-downstream-execution', '31-request-contract-and-enforcement-ownership'],
    '24-solved-stateless-tool-call-and-downstream-authority':
      ['3-request-scoped-authorization-and-downstream-execution', '33-canonical-request-to-effect-flow'],
    '25-retry-idempotency-and-custom-transports':
      ['3-request-scoped-authorization-and-downstream-execution', '34-retry-idempotency-and-custom-transports'],
  },
  '3-scope-and-client-identity-lifecycle': {
    '3-scope-and-client-identity-lifecycle':
      ['4-scope-selection-and-runtime-step-up', '4-scope-selection-and-runtime-step-up'],
    '31-scope-communication-channels':
      ['4-scope-selection-and-runtime-step-up', '41-scope-communication-and-five-actor-responsibility'],
    '311-authorization-preflight-discovery-registration-and-issuer-binding':
      ['4-scope-selection-and-runtime-step-up', '42-initial-scope-selection-and-transaction-binding'],
    '32-scope-selection-strategy':
      ['4-scope-selection-and-runtime-step-up', '42-initial-scope-selection-and-transaction-binding'],
    '33-scope-challenge-handling-403-insufficient-scope':
      ['4-scope-selection-and-runtime-step-up', '43-runtime-insufficient-scope-step-up'],
    '34-scope-minimization-best-practices':
      ['4-scope-selection-and-runtime-step-up', '44-scope-minimization-challenge-governance-and-rar-handoff'],
    '35-how-scopes-interact-with-related-sections':
      ['4-scope-selection-and-runtime-step-up', '44-scope-minimization-challenge-governance-and-rar-handoff'],
    '36-high-assurance-authorization-fapi-20-par-jar-jarm':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '28-high-assurance-oauth-profile-overlay'],
    '361-specification-landscape':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '28-high-assurance-oauth-profile-overlay'],
    '362-mcp-gateway-fapi-20-support':
      ['2-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '28-high-assurance-oauth-profile-overlay'],
  },
  '14-authorization-approval-and-consent-models': {
    '141-first-party-authorization-enterprisesame-organization':
      ['15-authorization-approval-and-consent-models', '151-first-party-authorization'],
    '146-machine-to-machine-m2m-flows-without-user-involvement':
      ['15-authorization-approval-and-consent-models', '156-machine-authority-is-not-consent'],
  },
};

function decodeHeadingId(hash) {
  const encodedHeadingId = String(hash ?? '').replace(/^#/, '');
  if (!encodedHeadingId) {
    return '';
  }

  try {
    return decodeURIComponent(encodedHeadingId);
  } catch {
    return encodedHeadingId;
  }
}

function shiftNumberedHeadingId(chapterId, targetChapterId, headingId) {
  const sourceChapterNumber = chapterId.match(/^(\d+)-/)?.[1];
  const targetChapterNumber = targetChapterId.match(/^(\d+)-/)?.[1];

  if (
    !headingId ||
    !sourceChapterNumber ||
    !targetChapterNumber ||
    !headingId.startsWith(sourceChapterNumber)
  ) {
    return headingId;
  }

  return `${targetChapterNumber}${headingId.slice(sourceChapterNumber.length)}`;
}

export function resolvePublishedLinkMigration({
  documentSlug,
  chapterId,
  search = '',
  hash = '',
}) {
  if (documentSlug !== DR_0001_SLUG || !chapterId) {
    return null;
  }

  const headingId = decodeHeadingId(hash);
  const exactTarget = headingId
    ? DR_0001_HEADING_MIGRATIONS[chapterId]?.[headingId]
    : null;
  const targetChapterId = exactTarget?.[0] ?? DR_0001_CHAPTER_MIGRATIONS[chapterId];

  if (!targetChapterId) {
    return null;
  }

  const targetHeadingId = exactTarget?.[1] ?? shiftNumberedHeadingId(
    chapterId,
    targetChapterId,
    headingId,
  );
  const targetHash = targetHeadingId ? `#${targetHeadingId}` : '';

  if (targetChapterId === chapterId && targetHash === hash) {
    return null;
  }

  return {
    pathname: `/${documentSlug}/${targetChapterId}`,
    search,
    hash: targetHash,
  };
}

export const publishedLinkMigrationEntries = Object.freeze(
  Object.entries(DR_0001_HEADING_MIGRATIONS).flatMap(([chapterId, headings]) => (
    Object.entries(headings).map(([headingId, [targetChapterId, targetHeadingId]]) => ({
      documentSlug: DR_0001_SLUG,
      chapterId,
      headingId,
      targetChapterId,
      targetHeadingId,
    }))
  )),
);
