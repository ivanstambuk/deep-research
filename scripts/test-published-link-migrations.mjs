import assert from 'node:assert/strict';
import {
  publishedLinkMigrationEntries,
  resolvePublishedLinkMigration,
} from '../src/features/reader/publishedLinkMigrations.js';

const DR_0001_SLUG = 'DR-0001-mcp-authentication-authorization-agent-identity';

assert.equal(publishedLinkMigrationEntries.length, 26);

for (const entry of publishedLinkMigrationEntries) {
  const search = '?theme=dark&source=bookmark';
  const resolved = resolvePublishedLinkMigration({
    documentSlug: entry.documentSlug,
    chapterId: entry.chapterId,
    search,
    hash: `#${entry.headingId}`,
  });

  assert.deepEqual(resolved, {
    pathname: `/${entry.documentSlug}/${entry.targetChapterId}`,
    search,
    hash: `#${entry.targetHeadingId}`,
  });
}

assert.deepEqual(
  resolvePublishedLinkMigration({
    documentSlug: DR_0001_SLUG,
    chapterId: '1-current-mcp-authorization-and-protocol-baseline',
    search: '?view=wide',
  }),
  {
    pathname: `/${DR_0001_SLUG}/1-mcp-authorization-bootstrap-client-trust-and-grant-profiles`,
    search: '?view=wide',
    hash: '',
  },
);

assert.deepEqual(
  resolvePublishedLinkMigration({
    documentSlug: DR_0001_SLUG,
    chapterId: '2-stateless-streamable-http-authorization',
    hash: '#future-compatible-anchor',
  }),
  {
    pathname: `/${DR_0001_SLUG}/2-request-scoped-authorization-and-downstream-execution`,
    search: '',
    hash: '#future-compatible-anchor',
  },
);

assert.equal(
  resolvePublishedLinkMigration({
    documentSlug: 'DR-0002-eudi-wallet-relying-party-integration',
    chapterId: '1-current-mcp-authorization-and-protocol-baseline',
    hash: '#12-authorization-trust-chain',
  }),
  null,
);

assert.equal(
  resolvePublishedLinkMigration({
    documentSlug: DR_0001_SLUG,
    chapterId: '14-authorization-approval-and-consent-models',
    hash: '#142-third-party-consent-and-downstream-token-separation',
  }),
  null,
);

assert.equal(
  resolvePublishedLinkMigration({
    documentSlug: DR_0001_SLUG,
    chapterId: '14-authorization-approval-and-consent-models',
    hash: '#143-incremental-consent-in-agentic-workflows',
  }),
  null,
);

console.log(`[published links] ${publishedLinkMigrationEntries.length} DR-0001 heading migrations passed`);
