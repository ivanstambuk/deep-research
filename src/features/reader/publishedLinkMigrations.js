const DR_0001_SLUG = 'DR-0001-mcp-authentication-authorization-agent-identity';

const DR_0001_CHAPTER_MIGRATIONS = {
  '1-current-mcp-authorization-and-protocol-baseline':
    '1-mcp-authorization-bootstrap-client-trust-and-grant-profiles',
  '2-stateless-streamable-http-authorization':
    '2-request-scoped-authorization-and-downstream-execution',
  '3-scope-and-client-identity-lifecycle':
    '3-scope-selection-and-runtime-step-up',
};

const DR_0001_HEADING_MIGRATIONS = {
  '1-current-mcp-authorization-and-protocol-baseline': {
    '1-current-mcp-authorization-and-protocol-baseline':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '1-mcp-authorization-bootstrap-client-trust-and-grant-profiles'],
    '11-current-only-protocol-admission':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '11-current-only-protocol-admission'],
    '12-authorization-trust-chain':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '12-trust-boundaries-and-authorization-artifacts'],
    '13-client-registration-and-enterprise-governance':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '13-pre-registration-and-client-id-metadata-documents-cimd'],
    '131-client-id-metadata-documents-cimd':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '13-pre-registration-and-client-id-metadata-documents-cimd'],
    '132-enterprise-managed-authorization-identity-assertion-grant-protocol':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '16-enterprise-managed-authorization-alternative-grant-profile'],
    '14-layered-failure-taxonomy':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '19-layered-failure-and-recovery-taxonomy'],
    '15-solved-authorization-bootstrap':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '15-canonical-interactive-mcp-oauth-bootstrap'],
  },
  '2-stateless-streamable-http-authorization': {
    '2-stateless-streamable-http-authorization':
      ['2-request-scoped-authorization-and-downstream-execution', '2-request-scoped-authorization-and-downstream-execution'],
    '21-current-transport-contract':
      ['2-request-scoped-authorization-and-downstream-execution', '21-request-contract-and-enforcement-ownership'],
    '22-request-security-and-explicit-application-state':
      ['2-request-scoped-authorization-and-downstream-execution', '22-explicit-application-state-and-result-boundaries'],
    '23-gateway-and-server-enforcement':
      ['2-request-scoped-authorization-and-downstream-execution', '21-request-contract-and-enforcement-ownership'],
    '24-solved-stateless-tool-call-and-downstream-authority':
      ['2-request-scoped-authorization-and-downstream-execution', '23-canonical-request-to-effect-flow'],
    '25-retry-idempotency-and-custom-transports':
      ['2-request-scoped-authorization-and-downstream-execution', '24-retry-idempotency-and-custom-transports'],
  },
  '3-scope-and-client-identity-lifecycle': {
    '3-scope-and-client-identity-lifecycle':
      ['3-scope-selection-and-runtime-step-up', '3-scope-selection-and-runtime-step-up'],
    '31-scope-communication-channels':
      ['3-scope-selection-and-runtime-step-up', '31-scope-communication-and-five-actor-responsibility'],
    '311-authorization-preflight-discovery-registration-and-issuer-binding':
      ['3-scope-selection-and-runtime-step-up', '32-initial-scope-selection-and-transaction-binding'],
    '32-scope-selection-strategy':
      ['3-scope-selection-and-runtime-step-up', '32-initial-scope-selection-and-transaction-binding'],
    '33-scope-challenge-handling-403-insufficient-scope':
      ['3-scope-selection-and-runtime-step-up', '33-runtime-insufficient-scope-step-up'],
    '34-scope-minimization-best-practices':
      ['3-scope-selection-and-runtime-step-up', '34-scope-minimization-challenge-governance-and-rar-handoff'],
    '35-how-scopes-interact-with-related-sections':
      ['3-scope-selection-and-runtime-step-up', '34-scope-minimization-challenge-governance-and-rar-handoff'],
    '36-high-assurance-authorization-fapi-20-par-jar-jarm':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '18-high-assurance-oauth-profile-overlay'],
    '361-specification-landscape':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '18-high-assurance-oauth-profile-overlay'],
    '362-mcp-gateway-fapi-20-support':
      ['1-mcp-authorization-bootstrap-client-trust-and-grant-profiles', '18-high-assurance-oauth-profile-overlay'],
  },
  '14-authorization-approval-and-consent-models': {
    '141-first-party-authorization-enterprisesame-organization':
      ['14-authorization-approval-and-consent-models', '141-first-party-authorization'],
    '146-machine-to-machine-m2m-flows-without-user-involvement':
      ['14-authorization-approval-and-consent-models', '146-machine-authority-is-not-consent'],
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

  const targetHeadingId = exactTarget?.[1] ?? headingId;
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
