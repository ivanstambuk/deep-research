#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const DEFAULT_REGISTRY = 'data/standards-watch.yaml';
const ALLOWED_LIFECYCLES = new Set(['forward_floor', 'profile', 'monitor']);
const REQUIRED_RECORD_FIELDS = [
  'id',
  'title',
  'artifact_type',
  'lifecycle_decision',
  'external_status',
  'verified_on',
  'primary_sources',
  'current_dr_use',
  'non_claims',
  'adoption_triggers',
  'fallback_controls',
  'responsible_domain',
  'next_review_on',
  'affected_sections',
  'match_terms',
];
const REQUIRED_STRING_FIELDS = [
  'id',
  'title',
  'artifact_type',
  'external_status',
  'responsible_domain',
];
const REQUIRED_STRING_ARRAY_FIELDS = [
  'primary_sources',
  'current_dr_use',
  'non_claims',
  'adoption_triggers',
  'fallback_controls',
  'match_terms',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function sectionNumberFromHeading(line) {
  const match = line.match(/^#{1,6}\s+(\d+(?:\.\d+)*)\b/);
  return match?.[1] ?? null;
}

function extractSectionBodies(source) {
  const lines = source.split(/\r?\n/);
  const headings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const number = sectionNumberFromHeading(lines[index]);
    if (number) {
      headings.push({
        number,
        index,
        depth: number.split('.').length,
      });
    }
  }

  const sections = new Map();
  for (let headingIndex = 0; headingIndex < headings.length; headingIndex += 1) {
    const heading = headings[headingIndex];
    let end = lines.length;

    for (let candidateIndex = headingIndex + 1; candidateIndex < headings.length; candidateIndex += 1) {
      if (headings[candidateIndex].depth <= heading.depth) {
        end = headings[candidateIndex].index;
        break;
      }
    }

    sections.set(heading.number, lines.slice(heading.index, end).join('\n'));
  }

  return sections;
}

export function parseStandardsWatch(text, sourceName = DEFAULT_REGISTRY) {
  try {
    return YAML.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${sourceName}: malformed YAML: ${detail}`);
  }
}

export function readStandardsWatch(registryPath = DEFAULT_REGISTRY, rootDir = process.cwd()) {
  const absolutePath = path.resolve(rootDir, registryPath);
  const text = fs.readFileSync(absolutePath, 'utf8');
  return parseStandardsWatch(text, registryPath);
}

export function validateStandardsWatchData(
  data,
  {
    rootDir = process.cwd(),
    strictDue = false,
    today = new Date().toISOString().slice(0, 10),
  } = {},
) {
  const errors = [];
  const diagnostics = [];

  if (!isValidDate(today)) {
    errors.push(`validator: invalid comparison date "${today}"`);
    return { errors, diagnostics };
  }

  if (!isObject(data)) {
    errors.push('registry root must be a mapping');
    return { errors, diagnostics };
  }

  if (data.schema_version !== 1) {
    errors.push('schema_version must be 1');
  }

  if (!isObject(data.documents) || Object.keys(data.documents).length === 0) {
    errors.push('documents must be a non-empty mapping');
  }

  const documentSections = new Map();
  if (isObject(data.documents)) {
    for (const [documentId, document] of Object.entries(data.documents)) {
      if (!isObject(document)) {
        errors.push(`documents.${documentId} must be a mapping`);
        continue;
      }

      for (const field of ['title', 'source', 'mirror']) {
        if (!isNonEmptyString(document[field])) {
          errors.push(`documents.${documentId}.${field} must be a non-empty string`);
        }
      }

      if (!isNonEmptyString(document.source)) {
        continue;
      }

      const sourcePath = path.resolve(rootDir, document.source);
      if (!fs.existsSync(sourcePath)) {
        errors.push(`documents.${documentId}.source does not exist: ${document.source}`);
        continue;
      }

      const mirrorPath = isNonEmptyString(document.mirror)
        ? path.resolve(rootDir, document.mirror)
        : null;
      if (mirrorPath && !fs.existsSync(mirrorPath)) {
        errors.push(`documents.${documentId}.mirror does not exist: ${document.mirror}`);
      }

      documentSections.set(
        documentId,
        extractSectionBodies(fs.readFileSync(sourcePath, 'utf8')),
      );
    }
  }

  if (!Array.isArray(data.records) || data.records.length === 0) {
    errors.push('records must be a non-empty sequence');
    return { errors, diagnostics };
  }

  const ids = new Set();
  for (const [index, record] of data.records.entries()) {
    const label = isObject(record) && isNonEmptyString(record.id)
      ? `records[${index}] (${record.id})`
      : `records[${index}]`;

    if (!isObject(record)) {
      errors.push(`${label} must be a mapping`);
      continue;
    }

    for (const field of REQUIRED_RECORD_FIELDS) {
      if (!hasOwn(record, field)) {
        errors.push(`${label}.${field} is required`);
      }
    }

    for (const field of REQUIRED_STRING_FIELDS) {
      if (!isNonEmptyString(record[field])) {
        errors.push(`${label}.${field} must be a non-empty string`);
      }
    }

    for (const field of REQUIRED_STRING_ARRAY_FIELDS) {
      if (
        !Array.isArray(record[field])
        || record[field].length === 0
        || record[field].some((value) => !isNonEmptyString(value))
      ) {
        errors.push(`${label}.${field} must be a non-empty sequence of non-empty strings`);
      }
    }

    if (isNonEmptyString(record.id)) {
      if (ids.has(record.id)) {
        errors.push(`${label}.id duplicates "${record.id}"`);
      }
      ids.add(record.id);
    }

    if (!ALLOWED_LIFECYCLES.has(record.lifecycle_decision)) {
      errors.push(
        `${label}.lifecycle_decision must be one of ${[...ALLOWED_LIFECYCLES].join(', ')}`,
      );
    }

    for (const field of ['verified_on', 'next_review_on']) {
      if (!isValidDate(record[field])) {
        errors.push(`${label}.${field} must be a valid YYYY-MM-DD date`);
      }
    }

    if (Array.isArray(record.primary_sources)) {
      for (const source of record.primary_sources) {
        if (!isNonEmptyString(source)) {
          continue;
        }
        try {
          const url = new URL(source);
          if (url.protocol !== 'https:') {
            errors.push(`${label}.primary_sources must use HTTPS: ${source}`);
          }
        } catch {
          errors.push(`${label}.primary_sources contains an invalid URL: ${source}`);
        }
      }
    }

    if (!Array.isArray(record.affected_sections) || record.affected_sections.length === 0) {
      errors.push(`${label}.affected_sections must be a non-empty sequence`);
    } else {
      for (const [referenceIndex, reference] of record.affected_sections.entries()) {
        const referenceLabel = `${label}.affected_sections[${referenceIndex}]`;
        if (!isObject(reference) || !isNonEmptyString(reference.document)) {
          errors.push(`${referenceLabel}.document must be a non-empty string`);
          continue;
        }
        if (!Array.isArray(reference.sections) || reference.sections.length === 0) {
          errors.push(`${referenceLabel}.sections must be a non-empty sequence`);
          continue;
        }

        const sections = documentSections.get(reference.document);
        if (!sections) {
          errors.push(`${referenceLabel} references unknown document "${reference.document}"`);
          continue;
        }

        for (const section of reference.sections) {
          if (!isNonEmptyString(section) || !sections.has(section)) {
            errors.push(`${referenceLabel} references unknown section "${section}"`);
            continue;
          }

          if (
            Array.isArray(record.match_terms)
            && record.match_terms.length > 0
            && !record.match_terms.some((term) => (
              isNonEmptyString(term)
              && sections.get(section).toLocaleLowerCase('en-US')
                .includes(term.toLocaleLowerCase('en-US'))
            ))
          ) {
            errors.push(
              `${label} is not found in ${reference.document} §${section} by any match_terms value`,
            );
          }
        }
      }
    }

    if (hasOwn(record, 'status_history')) {
      if (!Array.isArray(record.status_history) || record.status_history.length === 0) {
        errors.push(`${label}.status_history must be a non-empty sequence when present`);
      } else {
        for (const [historyIndex, history] of record.status_history.entries()) {
          const historyLabel = `${label}.status_history[${historyIndex}]`;
          if (!isObject(history)) {
            errors.push(`${historyLabel} must be a mapping`);
            continue;
          }
          if (!isValidDate(history.on)) {
            errors.push(`${historyLabel}.on must be a valid YYYY-MM-DD date`);
          }
          if (!isNonEmptyString(history.status)) {
            errors.push(`${historyLabel}.status must be a non-empty string`);
          }
        }
      }
    }

    if (isValidDate(record.next_review_on) && record.next_review_on <= today) {
      const message = `${label} review is due (${record.next_review_on} <= ${today})`;
      diagnostics.push(message);
      if (strictDue) {
        errors.push(message);
      }
    }
  }

  return { errors, diagnostics };
}

function parseArguments(argv) {
  const options = {
    registryPath: DEFAULT_REGISTRY,
    strictDue: false,
    today: new Date().toISOString().slice(0, 10),
  };
  let registryProvided = false;

  for (const argument of argv) {
    if (argument === '--strict-due') {
      options.strictDue = true;
    } else if (argument.startsWith('--today=')) {
      options.today = argument.slice('--today='.length);
    } else if (argument.startsWith('-')) {
      throw new Error(`unknown option: ${argument}`);
    } else if (!registryProvided) {
      options.registryPath = argument;
      registryProvided = true;
    } else {
      throw new Error(`unexpected argument: ${argument}`);
    }
  }

  return options;
}

export function runStandardsWatchCli(argv = process.argv.slice(2), rootDir = process.cwd()) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    console.error(`Standards-watch validation failed: ${error.message}`);
    return 1;
  }

  let data;
  try {
    data = readStandardsWatch(options.registryPath, rootDir);
  } catch (error) {
    console.error(`Standards-watch validation failed: ${error.message}`);
    return 1;
  }

  const { errors, diagnostics } = validateStandardsWatchData(data, {
    rootDir,
    strictDue: options.strictDue,
    today: options.today,
  });

  for (const diagnostic of diagnostics) {
    console.warn(`Standards-watch diagnostic: ${diagnostic}`);
  }

  if (errors.length > 0) {
    console.error(`Standards-watch validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    return 1;
  }

  console.log(
    `Standards-watch validation passed: ${data.records.length} records`
    + (diagnostics.length > 0 ? `, ${diagnostics.length} due diagnostic(s)` : ''),
  );
  return 0;
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  process.exitCode = runStandardsWatchCli();
}
