#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  parseStandardsWatch,
  readStandardsWatch,
  validateStandardsWatchData,
} from './validate-standards-watch.mjs';

const rootDir = process.cwd();
const validRegistry = readStandardsWatch('data/standards-watch.yaml', rootDir);

function clone(value) {
  return structuredClone(value);
}

function validate(data, options = {}) {
  return validateStandardsWatchData(data, {
    rootDir,
    today: '2026-07-25',
    ...options,
  });
}

function expectError(name, mutate, pattern) {
  const candidate = clone(validRegistry);
  mutate(candidate);
  const result = validate(candidate);
  assert.match(
    result.errors.join('\n'),
    pattern,
    `${name}: expected matching validation error, got ${JSON.stringify(result)}`,
  );
}

const validResult = validate(validRegistry);
assert.deepEqual(validResult.errors, [], `valid registry failed: ${validResult.errors.join('\n')}`);

assert.throws(
  () => parseStandardsWatch('records: [', 'malformed-fixture.yaml'),
  /malformed YAML/,
  'malformed YAML must be rejected',
);

expectError(
  'duplicate IDs',
  (data) => {
    data.records[1].id = data.records[0].id;
  },
  /duplicates/,
);

expectError(
  'invalid dates',
  (data) => {
    data.records[0].verified_on = '2026-02-30';
  },
  /valid YYYY-MM-DD date/,
);

expectError(
  'missing sources',
  (data) => {
    delete data.records[0].primary_sources;
  },
  /primary_sources/,
);

expectError(
  'invalid lifecycle',
  (data) => {
    data.records[0].lifecycle_decision = 'automatic_adoption';
  },
  /lifecycle_decision/,
);

expectError(
  'broken section reference',
  (data) => {
    data.records[0].affected_sections[0].sections = ['99.99'];
  },
  /unknown section/,
);

const dueCandidate = clone(validRegistry);
dueCandidate.records[0].next_review_on = '2026-07-24';
const dueDiagnostic = validate(dueCandidate);
assert.equal(dueDiagnostic.errors.length, 0, 'due dates must not fail ordinary validation');
assert.match(dueDiagnostic.diagnostics.join('\n'), /review is due/);

const strictDue = validate(dueCandidate, { strictDue: true });
assert.match(strictDue.errors.join('\n'), /review is due/);

console.log('Standards-watch tests passed: valid data and 7 required negative/diagnostic cases');
