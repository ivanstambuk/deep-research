export const SEARCH_MIN_QUERY_LENGTH = 3;
export const SEARCH_RECENTS_KEY = 'dr-reader-search-recents-v1';
export const SEARCH_RESULT_LIMIT = 24;

export const SEARCH_INDEX_OPTIONS = {
  idField: 'id',
  fields: ['drId', 'documentTitle', 'headingText', 'headingPath', 'text'],
  storeFields: [
    'id',
    'slug',
    'drId',
    'documentTitle',
    'chapterId',
    'sectionId',
    'headingId',
    'headingText',
    'headingPath',
    'text',
    'type',
    'targetId',
  ],
  searchOptions: {
    prefix: true,
    fuzzy: 0,
    combineWith: 'AND',
    boost: {
      headingText: 8,
      headingPath: 4,
      documentTitle: 2,
      drId: 2,
      text: 1,
    },
  },
};

export function normalizeSearchText(value) {
  return value
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getSearchTokens(query) {
  return Array.from(new Set(
    normalizeSearchText(query)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  ));
}
