import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MiniSearch from 'minisearch';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import manifest from './generated/reader-manifest.json';
import DocumentPage from './features/reader/DocumentPage.jsx';
import {
  SEARCH_INDEX_OPTIONS,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_RECENTS_KEY,
  SEARCH_RESULT_LIMIT,
  getSearchTokens,
  normalizeSearchText,
} from './searchConfig.js';
import 'katex/dist/katex.min.css';
import './index.css';

const documentLoaders = import.meta.glob('./generated/documents/*.json');
// Transport invariant: progressive reader payloads must come through one explicit mechanism.
// Shell, deferred section chunks, and search payloads all load through the Vite module graph here.
// Do not mix this with ad-hoc public/generated fetches, or dev/prod transport behavior will diverge again.
const searchLoaders = import.meta.glob('./generated/search/**/*.json');
const ENABLE_PROGRESSIVE_DOCUMENT_RENDERING = true;
const THEME_STORAGE_KEY = 'dr-reader-theme';
const TEXT_SIZE_STORAGE_KEY = 'dr-reader-text-size';
const TEXT_SIZE_OPTIONS = ['small', 'standard', 'large'];
const GLOBAL_SEARCH_MODULE_PATH = manifest.globalSearchModulePath;

const documents = (manifest.documents ?? [])
  .map((entry) => ({
    ...entry,
    loadShell: documentLoaders[`./generated/documents/${entry.slug}.json`],
  }))
  .filter((entry) => entry.loadShell)
  .sort((left, right) => left.order - right.order);

const searchIndexCache = new Map();

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function normalizeStatus(status) {
  if (!status) {
    return 'Draft';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function truncateText(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}…`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSearchPattern(query) {
  const tokens = getSearchTokens(query);
  if (!tokens.length) {
    return null;
  }

  return new RegExp(tokens.map((token) => escapeRegExp(token)).join('|'), 'ig');
}

function createSnippet(text, query, radius = 96) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }

  const tokens = getSearchTokens(query).map((token) => token.toLowerCase());
  if (!tokens.length) {
    return compact.slice(0, radius * 2);
  }

  const lower = compact.toLowerCase();
  let matchIndex = -1;
  let matchLength = 0;

  for (const token of tokens) {
    const index = lower.indexOf(token);
    if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
      matchIndex = index;
      matchLength = token.length;
    }
  }

  if (matchIndex === -1) {
    return compact.slice(0, radius * 2);
  }

  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(compact.length, matchIndex + matchLength + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < compact.length ? '…' : '';

  return `${prefix}${compact.slice(start, end).trim()}${suffix}`;
}

async function loadSearchIndex(modulePath) {
  if (!modulePath) {
    throw new Error('Missing search index module path');
  }

  if (!searchIndexCache.has(modulePath)) {
    const loader = searchLoaders[modulePath];
    if (!loader) {
      throw new Error(`Missing generated search payload for ${modulePath}`);
    }

    const promise = loader().then((module) => {
      const payload = module.default ?? module;
      return {
      payload,
      index: MiniSearch.loadJSON(JSON.stringify(payload.index), SEARCH_INDEX_OPTIONS),
      };
    });
    searchIndexCache.set(modulePath, promise);
  }

  return searchIndexCache.get(modulePath);
}

function readRecentSearches() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_RECENTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  const normalized = query.trim();
  if (normalized.length < SEARCH_MIN_QUERY_LENGTH) {
    return;
  }

  const next = [normalized, ...readRecentSearches().filter((item) => item !== normalized)].slice(0, 6);

  try {
    window.localStorage.setItem(SEARCH_RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors and keep search functional.
  }
}

function scoreSearchResult(result, query) {
  const queryText = normalizeSearchText(query);
  const headingText = normalizeSearchText(result.headingText ?? '');
  const headingPath = normalizeSearchText(result.headingPath ?? '');
  const contentText = normalizeSearchText(result.text ?? '');
  const documentTitle = normalizeSearchText(result.documentTitle ?? '');
  const tokenPattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(queryText)}($|[^a-z0-9])`, 'i');
  const contentIndex = contentText.indexOf(queryText);
  let score = result.score ?? 0;

  if (headingText === queryText) {
    score += 10000;
  } else if (tokenPattern.test(headingText)) {
    score += 7000;
  } else if (headingText.includes(queryText)) {
    score += 3500;
  }

  if (headingPath.includes(queryText)) {
    score += 1100;
  }

  if (documentTitle.includes(queryText)) {
    score += 600;
  }

  if (contentIndex >= 0) {
    score += 900 - Math.min(contentIndex, 400) / 8;
  } else {
    const tokens = getSearchTokens(query);
    const tokenMatches = tokens.filter((token) => contentText.includes(token)).length;
    score += tokenMatches * 120;
  }

  if (result.type === 'heading') {
    score += 140;
  }

  return score;
}

function dedupeSearchResults(results) {
  const visible = [];
  const clusterCounts = new Map();

  results.forEach((result) => {
    const clusterKey = `${result.slug}::${result.headingId ?? result.targetId}`;
    const currentCount = clusterCounts.get(clusterKey) ?? 0;

    if (currentCount >= 1) {
      return;
    }

    clusterCounts.set(clusterKey, currentCount + 1);
    visible.push(result);
  });

  return visible.slice(0, SEARCH_RESULT_LIMIT);
}

function searchIndexResults(index, query) {
  const normalized = normalizeSearchText(query);
  if (!index || normalized.length < SEARCH_MIN_QUERY_LENGTH) {
    return [];
  }

  const baseResults = index.search(normalized, SEARCH_INDEX_OPTIONS.searchOptions);

  return dedupeSearchResults(
    baseResults
      .map((result) => ({
        ...result,
        rankScore: scoreSearchResult(result, normalized),
      }))
      .sort((left, right) => right.rankScore - left.rankScore),
  );
}


function renderHighlightedText(text, query) {
  const pattern = createSearchPattern(query);
  if (!pattern || !text) {
    return text;
  }

  const matches = Array.from(text.matchAll(pattern));
  if (!matches.length) {
    return text;
  }

  const parts = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const value = match[0] ?? '';

    if (start > lastIndex) {
      parts.push(<React.Fragment key={`text-${index}-${lastIndex}`}>{text.slice(lastIndex, start)}</React.Fragment>);
    }

    parts.push(
      <mark key={`mark-${index}-${start}`} className="outline-search-highlight">
        {value}
      </mark>,
    );
    lastIndex = start + value.length;
  });

  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={`tail-${lastIndex}`}>{text.slice(lastIndex)}</React.Fragment>);
  }

  return parts;
}

function formatCardMeta(document) {
  const parts = [normalizeStatus(document.status)];

  if (document.dateUpdated) {
    parts.push(`Updated ${formatDate(document.dateUpdated)}`);
  }

  if (Array.isArray(document.authors)) {
    const authorNames = document.authors.map((author) => author?.name).filter(Boolean);
    if (authorNames.length) {
      parts.push(authorNames.join(', '));
    }
  }

  return parts.join(' • ');
}

function readInitialTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to default.
  }

  return 'dark';
}

function readInitialTextSize() {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    if (TEXT_SIZE_OPTIONS.includes(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to default.
  }

  return 'standard';
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const editableParent = target.closest('input, textarea, select, [contenteditable="true"]');
  return Boolean(editableParent);
}

function groupSearchResults(results) {
  return {
    headings: results.filter((result) => result.type === 'heading'),
    passages: results.filter((result) => result.type !== 'heading'),
  };
}

function buildBreadcrumb(result, showDocumentTitle) {
  const parts = [];

  if (showDocumentTitle) {
    parts.push(result.documentTitle);
  }

  if (result.headingPath) {
    parts.push(result.headingPath);
  }

  return parts.filter(Boolean).join(' / ');
}

function OverviewPage() {
  const totalLines = useMemo(
    () => documents.reduce((total, document) => total + document.lineCount, 0),
    [],
  );

  return (
    <section className="overview-page page-shell">
      <div className="library-hero">
        <div className="library-hero-copy">
          <span className="hero-kicker">Deep Research</span>
          <h1>Reference reader for the full DR corpus.</h1>
          <p>
            Open any document from here. Once you enter a document, the left rail disappears and the reading
            surface expands while the table of contents stays on the right.
          </p>
        </div>

        <div className="library-stats">
          <div className="library-stat">
            <span>{documents.length}</span>
            <small>documents</small>
          </div>
          <div className="library-stat">
            <span>{totalLines.toLocaleString()}</span>
            <small>lines indexed</small>
          </div>
        </div>
      </div>

      <div className="hero-panel">
        <span className="hero-kicker">Local Preview</span>
        <h1>Deep Research documents, rendered as documents instead of raw markdown dumps.</h1>
        <p>
          This reader keeps the corpus navigable while you iterate locally: metadata is separated from the
          article body, the in-document table of contents becomes an outline, and each DR is preprocessed
          before the browser sees it.
        </p>
      </div>

      <div className="document-grid library-grid">
        {documents.map((document) => (
          <Link key={document.slug} to={`/${document.slug}`} className="document-card">
            <span className="document-card-id">{document.drId}</span>
            <h2>{document.title}</h2>
            <p>{truncateText(document.summary, 180) || 'Open the reference reader view for this document.'}</p>
            <span className="document-card-meta">{formatCardMeta(document)}</span>
            <span className="document-card-cta">Open document →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SearchResultsList({ results, query, currentScope, selectedIndex, onSelect, setSelectedIndex }) {
  const groupedResults = useMemo(() => groupSearchResults(results), [results]);
  const flatIndexRef = useRef([]);

  flatIndexRef.current = [];
  let offset = 0;
  const groups = [
    ['Headings', groupedResults.headings],
    ['Passages', groupedResults.passages],
  ].filter(([, items]) => items.length);

  return (
    <div className="search-results">
      {groups.map(([label, items]) => {
        const groupOffset = offset;
        offset += items.length;

        return (
          <section key={label} className="search-results-group">
            <div className="search-results-group-label">{label}</div>
            <div className="search-results-list" role="listbox" aria-label={label}>
              {items.map((result, index) => {
                const globalIndex = groupOffset + index;
                const showDocumentLabel = currentScope === 'all';
                const breadcrumb = buildBreadcrumb(result, showDocumentLabel);
                const snippet = createSnippet(result.text ?? '', query);

                return (
                  <button
                    key={result.id}
                    ref={(node) => {
                      flatIndexRef.current[globalIndex] = node;
                    }}
                    data-search-result-heading-id={result.headingId ?? ''}
                    data-search-result-target-id={result.targetId ?? ''}
                    type="button"
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    className={`search-result${selectedIndex === globalIndex ? ' is-selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    onClick={() => onSelect(result)}
                  >
                    <div className="search-result-topline">
                      <span className="search-result-title">
                        {renderHighlightedText(result.headingText || result.documentTitle, query)}
                      </span>
                      {showDocumentLabel ? <span className="search-result-badge">{result.drId}</span> : null}
                    </div>
                    {breadcrumb ? (
                      <div className="search-result-path">{renderHighlightedText(breadcrumb, query)}</div>
                    ) : null}
                    {snippet ? (
                      <div className="search-result-snippet">{renderHighlightedText(snippet, query)}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function GlobalSearchModal({ isOpen, onClose, currentDocument }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(currentDocument ? 'document' : 'all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches());

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setScope(currentDocument ? 'document' : 'all');
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
    setError(null);
    setRecentSearches(readRecentSearches());

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, currentDocument]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const activeModulePath = scope === 'document' && currentDocument
      ? currentDocument.searchModulePath
      : GLOBAL_SEARCH_MODULE_PATH;
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadSearchIndex(activeModulePath)
      .then(({ index }) => {
        if (cancelled) {
          return;
        }

        const nextResults = searchIndexResults(index, trimmedQuery);
        setResults(nextResults);
        setSelectedIndex(0);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError);
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentDocument, isOpen, query, scope]);

  useEffect(() => {
    if (!isOpen || !results.length) {
      return undefined;
    }

    const selectedNode = modalRef.current?.querySelector('[aria-selected="true"]');
    selectedNode?.scrollIntoView({ block: 'nearest' });
    return undefined;
  }, [isOpen, results, selectedIndex]);

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((result) => {
    const term = query.trim();
    if (term.length >= SEARCH_MIN_QUERY_LENGTH) {
      saveRecentSearch(term);
      setRecentSearches(readRecentSearches());
    }

    closeModal();
    navigate(
      {
        pathname: `/${result.slug}`,
        search: location.search,
        hash: '',
      },
      {
        state: {
          searchNavigation: {
            sectionId: result.sectionId ?? null,
            chunkId: result.chunkId ?? null,
            headingId: result.headingId ?? null,
            targetId: result.targetId ?? null,
            term,
            nonce: Date.now(),
          },
        },
      },
    );
  }, [closeModal, navigate, query]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusables = modalRef.current?.querySelectorAll(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
      );

      if (!focusables?.length) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }

      return;
    }

    if (!results.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleSelect(results[selectedIndex] ?? results[0]);
    }
  }, [closeModal, handleSelect, results, selectedIndex]);

  if (!isOpen) {
    return null;
  }

  const trimmedQuery = query.trim();
  const tooShort = trimmedQuery.length > 0 && trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH;
  const showTabs = Boolean(currentDocument);

  return (
    <div className="search-modal-backdrop" onClick={closeModal}>
      <div
        ref={modalRef}
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search documents"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="search-modal-header">
          <label className="search-modal-field" htmlFor="reader-global-search">
            <span className="search-modal-icon" aria-hidden="true">⌕</span>
            <input
              ref={inputRef}
              id="reader-global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                currentDocument
                  ? 'Search this document or switch to all documents…'
                  : 'Search DR IDs, sections, subsections, and passages…'
              }
              autoComplete="off"
              spellCheck="false"
            />
          </label>
          <button type="button" className="search-modal-close" onClick={closeModal} aria-label="Close search">
            Esc
          </button>
        </div>

        {showTabs ? (
          <div className="search-scope-tabs" role="tablist" aria-label="Search scope">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'document'}
              className={`search-scope-tab${scope === 'document' ? ' is-active' : ''}`}
              onClick={() => setScope('document')}
            >
              This document
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'all'}
              className={`search-scope-tab${scope === 'all' ? ' is-active' : ''}`}
              onClick={() => setScope('all')}
            >
              All documents
            </button>
          </div>
        ) : null}

        <div className="search-modal-body">
          {!trimmedQuery ? (
            <div className="search-empty-state">
              <div className="search-empty-title">Recent searches</div>
              {recentSearches.length ? (
                <div className="search-recents">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="search-recent"
                      onClick={() => setQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p>Use Ctrl+K to jump quickly across the corpus. Recent searches will appear here.</p>
              )}
            </div>
          ) : tooShort ? (
            <div className="search-empty-state">
              <div className="search-empty-title">Keep typing</div>
              <p>Search starts after {SEARCH_MIN_QUERY_LENGTH} characters.</p>
            </div>
          ) : loading ? (
            <div className="search-empty-state">
              <div className="search-empty-title">Searching…</div>
              <p>Building the best matches for {scope === 'all' ? 'the full corpus' : currentDocument?.title}.</p>
            </div>
          ) : error ? (
            <div className="search-empty-state">
              <div className="search-empty-title">Search failed</div>
              <p>{String(error)}</p>
            </div>
          ) : results.length ? (
            <SearchResultsList
              results={results}
              query={trimmedQuery}
              currentScope={scope}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              setSelectedIndex={setSelectedIndex}
            />
          ) : (
            <div className="search-empty-state">
              <div className="search-empty-title">No results</div>
              <p>
                No matches for <strong>{trimmedQuery}</strong> in {scope === 'all' ? 'the full corpus' : 'this document'}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => readInitialTheme());
  const [textSize, setTextSize] = useState(() => readInitialTextSize());
  const [textMenuOpen, setTextMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const textMenuRef = useRef(null);
  const currentDocument = useMemo(
    () => documents.find((document) => location.pathname === `/${document.slug}`) ?? null,
    [location.pathname],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors and keep the in-memory preference.
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;

    try {
      window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
    } catch {
      // Ignore storage errors and keep the in-memory preference.
    }
  }, [textSize]);

  useEffect(() => {
    if (!textMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!textMenuRef.current?.contains(event.target)) {
        setTextMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [textMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey) {
        if (isEditableTarget(event.target) && !searchOpen) {
          return;
        }

        event.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <div className="reader-shell">
      <main className="content-shell">
        <div className="reader-toolbar">
          <button
            type="button"
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
          >
            <span className="search-trigger-icon" aria-hidden="true">⌕</span>
            <span className="search-trigger-label">
              Search {currentDocument ? 'this document or the corpus' : 'the deep research corpus'}
            </span>
            <span className="search-trigger-shortcut">Ctrl K</span>
          </button>

          <div className="reader-toolbar-actions">
            <div ref={textMenuRef} className="toolbar-menu">
              <button
                type="button"
                className="toolbar-button"
                onClick={() => setTextMenuOpen((current) => !current)}
                aria-expanded={textMenuOpen}
                aria-haspopup="dialog"
                aria-label="Change text size"
                title="Change text size"
              >
                Aa
              </button>
              {textMenuOpen ? (
                <div className="toolbar-popover text-size-popover" role="dialog" aria-label="Text size">
                  <div className="toolbar-popover-title">Text</div>
                  <div className="text-size-options">
                    {TEXT_SIZE_OPTIONS.map((option) => {
                      const checked = textSize === option;
                      const label = option.charAt(0).toUpperCase() + option.slice(1);

                      return (
                        <button
                          key={option}
                          type="button"
                          className={`text-size-option${checked ? ' is-selected' : ''}`}
                          onClick={() => {
                            setTextSize(option);
                            setTextMenuOpen(false);
                          }}
                          aria-pressed={checked}
                        >
                          <span className="text-size-radio" aria-hidden="true">
                            <span className="text-size-radio-dot" />
                          </span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="toolbar-button theme-toggle"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-pressed={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<OverviewPage />} />
          {documents.map((document) => (
            <Route
              key={document.slug}
              path={`/${document.slug}`}
              element={<DocumentPage readerDocumentMeta={document} theme={theme} />}
            />
          ))}
        </Routes>

        <GlobalSearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          currentDocument={currentDocument}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
