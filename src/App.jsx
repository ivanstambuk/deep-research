import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MiniSearch from 'minisearch';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import manifest from './generated/reader-manifest.json';
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
const THEME_STORAGE_KEY = 'dr-reader-theme';
const TEXT_SIZE_STORAGE_KEY = 'dr-reader-text-size';
const TEXT_SIZE_OPTIONS = ['small', 'standard', 'large'];
const GLOBAL_SEARCH_URL = '/generated/search/global.json';
const SEARCH_HIGHLIGHT_DURATION_MS = 3500;

const documents = manifest
  .map((entry) => ({
    ...entry,
    loadShell: documentLoaders[`./generated/documents/${entry.slug}.json`],
    bodyUrl: `/generated/document-bodies/${entry.slug}.json`,
    searchUrl: `/generated/search/documents/${entry.slug}.json`,
  }))
  .filter((entry) => entry.loadShell)
  .sort((left, right) => left.order - right.order);

let mermaidModulePromise = null;
const searchIndexCache = new Map();

function getMermaidConfig() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  return {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    fontSize: 14,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      nodeSpacing: 30,
      rankSpacing: 34,
      padding: 12,
    },
    themeVariables: isDark ? {
      background: 'transparent',
      primaryColor: '#242b33',
      primaryTextColor: '#f2ede6',
      primaryBorderColor: '#b7bfc9',
      lineColor: '#c4ccd6',
      secondaryColor: '#3a424d',
      tertiaryColor: '#1b2128',
      mainBkg: '#242b33',
      secondBkg: '#313945',
      tertiaryBkg: '#1b2128',
      nodeBorder: '#b7bfc9',
      clusterBkg: '#1b2128',
      clusterBorder: '#6e7783',
      titleColor: '#f2ede6',
      textColor: '#f2ede6',
      edgeLabelBackground: '#5f646b',
      actorBkg: '#242b33',
      actorBorder: '#b7bfc9',
      actorTextColor: '#f2ede6',
      actorLineColor: '#c4ccd6',
      signalColor: '#c4ccd6',
      signalTextColor: '#f2ede6',
      labelBoxBkgColor: '#5f646b',
      labelBoxBorderColor: '#8c949d',
      labelTextColor: '#f2ede6',
      loopTextColor: '#f2ede6',
      noteBkgColor: '#5f646b',
      noteBorderColor: '#8c949d',
      noteTextColor: '#f2ede6',
      activationBorderColor: '#c4ccd6',
      activationBkgColor: '#313945',
      sequenceNumberColor: '#f2ede6',
    } : {
      background: 'transparent',
      primaryColor: '#f4efe8',
      primaryTextColor: '#1f2328',
      primaryBorderColor: '#b9b1a6',
      lineColor: '#7d7367',
      secondaryColor: '#eee6db',
      tertiaryColor: '#f7f3ed',
      mainBkg: '#f4efe8',
      secondBkg: '#eee6db',
      tertiaryBkg: '#f7f3ed',
      nodeBorder: '#b9b1a6',
      clusterBkg: '#f7f3ed',
      clusterBorder: '#b9b1a6',
      titleColor: '#1f2328',
      textColor: '#1f2328',
      edgeLabelBackground: '#f3ede4',
      actorBkg: '#f4efe8',
      actorBorder: '#b9b1a6',
      actorTextColor: '#1f2328',
      actorLineColor: '#7d7367',
      signalColor: '#7d7367',
      signalTextColor: '#1f2328',
      labelBoxBkgColor: '#f3ede4',
      labelBoxBorderColor: '#b9b1a6',
      labelTextColor: '#1f2328',
      loopTextColor: '#1f2328',
      noteBkgColor: '#f3ede4',
      noteBorderColor: '#b9b1a6',
      noteTextColor: '#1f2328',
      activationBorderColor: '#7d7367',
      activationBkgColor: '#eee6db',
      sequenceNumberColor: '#1f2328',
    },
  };
}

async function renderMermaid(root) {
  const mermaidCodeBlocks = root.querySelectorAll('pre > code.language-mermaid');
  const existingMermaidNodes = root.querySelectorAll('.mermaid[data-mermaid-source]');

  if (!mermaidCodeBlocks.length && !existingMermaidNodes.length) {
    return;
  }

  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((module) => module.default);
  }

  const mermaid = await mermaidModulePromise;
  mermaid.initialize(getMermaidConfig());
  const nodes = [];

  mermaidCodeBlocks.forEach((code, index) => {
    const pre = code.parentElement;
    if (!pre) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'mermaid';
    container.id = `mermaid-diagram-${index}-${Math.random().toString(36).slice(2, 8)}`;
    const source = code.textContent
      ?.replace(/\u00a0/g, ' ')
      ?.replace(/&nbsp;/g, ' ')
      ?.trim() ?? '';
    container.dataset.mermaidSource = source;
    container.textContent = source;

    pre.replaceWith(container);
    nodes.push(container);
  });

  existingMermaidNodes.forEach((node, index) => {
    const source = node.dataset.mermaidSource;
    if (!source) {
      return;
    }

    node.id = `mermaid-diagram-rerender-${index}-${Math.random().toString(36).slice(2, 8)}`;
    node.removeAttribute('data-processed');
    node.innerHTML = '';
    node.textContent = source;
    nodes.push(node);
  });

  if (nodes.length) {
    await mermaid.run({ nodes });
  }
}

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

function clearSearchHighlights(root) {
  root.querySelectorAll('.doc-search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }

    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });

  root.querySelectorAll('.doc-search-hit').forEach((element) => {
    element.classList.remove('doc-search-hit');
  });
}

function highlightElementText(element, query) {
  const pattern = createSearchPattern(query);
  if (!pattern) {
    return false;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.parentElement?.closest('mark')) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  let matched = false;

  nodes.forEach((node) => {
    const text = node.nodeValue ?? '';
    pattern.lastIndex = 0;

    if (!pattern.test(text)) {
      return;
    }

    matched = true;
    pattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const value = match[0] ?? '';

      if (index > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, index)));
      }

      const mark = document.createElement('mark');
      mark.className = 'doc-search-highlight';
      mark.textContent = value;
      fragment.append(mark);
      lastIndex = index + value.length;
    }

    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  if (matched) {
    element.classList.add('doc-search-hit');
  }

  return matched;
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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
}

async function loadSearchIndex(url) {
  if (!searchIndexCache.has(url)) {
    const promise = fetchJson(url).then((payload) => ({
      payload,
      index: MiniSearch.loadJSON(JSON.stringify(payload.index), SEARCH_INDEX_OPTIONS),
    }));
    searchIndexCache.set(url, promise);
  }

  return searchIndexCache.get(url);
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

function scrollIntoViewWithOffset(element, offset = 116) {
  const top = window.scrollY + element.getBoundingClientRect().top - offset;
  window.scrollTo({ top, behavior: 'smooth' });
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

function buildOutlineTree(entries) {
  const roots = [];
  const stack = [];

  entries.forEach((entry) => {
    const node = { ...entry, children: [] };

    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  });

  return roots;
}

function findOutlinePath(nodes, targetId, trail = []) {
  for (const node of nodes) {
    const nextTrail = [...trail, node.id];

    if (node.id === targetId) {
      return nextTrail;
    }

    const nestedPath = findOutlinePath(node.children, targetId, nextTrail);
    if (nestedPath) {
      return nestedPath;
    }
  }

  return null;
}

function useActiveHeading(outline) {
  const ids = useMemo(() => outline.map((entry) => entry.id), [outline]);
  const [activeId, setActiveId] = useState(ids[0] ?? null);

  useEffect(() => {
    if (!ids.length) {
      setActiveId(null);
      return undefined;
    }

    let frame = null;

    const updateActiveHeading = () => {
      const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);

      if (!elements.length) {
        return;
      }

      const offset = 160;
      let nextActiveId = elements[0].id;

      for (const element of elements) {
        if (element.getBoundingClientRect().top <= offset) {
          nextActiveId = element.id;
        } else {
          break;
        }
      }

      setActiveId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    const requestUpdate = () => {
      if (frame !== null) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateActiveHeading();
      });
    };

    updateActiveHeading();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('hashchange', requestUpdate);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('hashchange', requestUpdate);
    };
  }, [ids]);

  return activeId;
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

function OutlinePanel({ outline, activeId, collapsed, onToggle }) {
  const tree = useMemo(() => buildOutlineTree(outline ?? []), [outline]);
  const chapterParentMap = useMemo(() => {
    const map = new Map();
    tree.forEach((group) => {
      group.children.forEach((chapter) => {
        if (chapter.level === 3) {
          map.set(chapter.id, group.id);
        }
      });
    });
    return map;
  }, [tree]);
  const chapterIds = useMemo(() => Array.from(chapterParentMap.keys()), [chapterParentMap]);
  const navRef = useRef(null);
  const hasHandledInitialActiveRef = useRef(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    hasHandledInitialActiveRef.current = false;
    const initialPath = hashId ? findOutlinePath(tree, hashId) : null;
    const initialChapterId = initialPath?.find((id) => chapterParentMap.has(id));
    setExpandedIds(initialChapterId ? new Set([initialChapterId]) : new Set());
  }, [tree, chapterParentMap]);

  useEffect(() => {
    if (!activeId) {
      return;
    }

    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hasHandledInitialActiveRef.current) {
      hasHandledInitialActiveRef.current = true;
      if (!hashId) {
        return;
      }
    }

    const path = findOutlinePath(tree, activeId);
    if (!path?.length) {
      return;
    }

    setExpandedIds((current) => {
      const next = new Set(current);
      const activeChapterId = path.find((id) => chapterParentMap.has(id));

      if (activeChapterId) {
        chapterIds.forEach((id) => next.delete(id));
        next.add(activeChapterId);
      }

      return next;
    });

    if (!navRef.current) {
      return;
    }

    const activeLink = navRef.current.querySelector(`[data-outline-id="${activeId}"]`);
    if (activeLink) {
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId, chapterIds, chapterParentMap, tree]);

  const toggleChapter = (chapterId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        chapterIds.forEach((id) => next.delete(id));
        next.add(chapterId);
      }

      return next;
    });
  };

  const jumpToNode = (node) => {
    const path = findOutlinePath(tree, node.id);
    const chapterId = path?.find((id) => chapterParentMap.has(id));

    if (chapterId) {
      setExpandedIds(new Set([chapterId]));
    }

    const target = document.getElementById(node.id);
    if (!target) {
      return;
    }

    window.history.replaceState(null, '', `#${node.id}`);
    scrollIntoViewWithOffset(target);
  };

  const renderDescendants = (nodes) => (
    <div className="outline-subtree">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;

        return (
          <div key={node.id} className={`outline-item level-${node.level}`}>
            <button
              type="button"
              data-outline-id={node.id}
              className={`outline-link level-${node.level}${activeId === node.id ? ' is-active' : ''}`}
              onClick={() => jumpToNode(node)}
            >
              {node.text}
            </button>
            {hasChildren ? renderDescendants(node.children) : null}
          </div>
        );
      })}
    </div>
  );

  const renderGroups = (groups) => (
    <div className="outline-groups">
      {groups.map((group) => (
        <section key={group.id} className="outline-section">
          <div className="outline-section-label">{group.text}</div>
          <div className="outline-chapter-list">
            {group.children.map((chapter) => {
              const hasChildren = chapter.children.length > 0;
              const expanded = expandedIds.has(chapter.id);

              return (
                <div key={chapter.id} className={`outline-item level-${chapter.level}`}>
                  <div className="outline-row is-clickable chapter-row">
                    {hasChildren ? (
                      <button
                        type="button"
                        className={`outline-branch-toggle${expanded ? ' is-expanded' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleChapter(chapter.id);
                        }}
                        aria-label={expanded ? `Collapse ${chapter.text}` : `Expand ${chapter.text}`}
                      >
                        ▸
                      </button>
                    ) : (
                      <span className="outline-branch-spacer" />
                    )}
                    <button
                      type="button"
                      data-outline-id={chapter.id}
                      className={`outline-link level-${chapter.level}${activeId === chapter.id ? ' is-active' : ''}`}
                      onClick={() => jumpToNode(chapter)}
                    >
                      {chapter.text}
                    </button>
                  </div>
                  {hasChildren && expanded ? renderDescendants(chapter.children) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  if (!tree.length) {
    return null;
  }

  return (
    <aside className={`outline-panel${collapsed ? ' is-collapsed' : ''}`}>
      <button
        type="button"
        className="outline-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show table of contents' : 'Hide table of contents'}
        title={collapsed ? 'Show table of contents' : 'Hide table of contents'}
      >
        ☰
      </button>
      {collapsed ? null : (
        <div className="outline-card">
          <nav ref={navRef} className="outline-nav">
            {renderGroups(tree)}
          </nav>
        </div>
      )}
    </aside>
  );
}

function MetadataPills({ document }) {
  const authorNames = Array.isArray(document.authors)
    ? document.authors.map((author) => author?.name).filter(Boolean)
    : [];

  return (
    <div className="meta-pills">
      <span className="meta-pill">{document.drId}</span>
      <span className="meta-pill">{normalizeStatus(document.status)}</span>
      {document.dateUpdated ? (
        <span className="meta-pill">Updated {formatDate(document.dateUpdated)}</span>
      ) : null}
      <span className="meta-pill">{document.lineCount.toLocaleString()} lines</span>
      {authorNames.length ? <span className="meta-pill">{authorNames.join(', ')}</span> : null}
    </div>
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

    const activeUrl = scope === 'document' && currentDocument ? currentDocument.searchUrl : GLOBAL_SEARCH_URL;
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

    loadSearchIndex(activeUrl)
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
        hash: result.headingId ? `#${result.headingId}` : '',
      },
      {
        state: {
          searchNavigation: {
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

function DocumentPage({ readerDocumentMeta, theme }) {
  const articleRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [state, setState] = useState({
    loading: true,
    shellData: null,
    bodyData: null,
    error: null,
  });
  const highlightTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    window.scrollTo({ top: 0 });

    async function load() {
      setState({ loading: true, shellData: null, bodyData: null, error: null });

      try {
        const shellModule = await readerDocumentMeta.loadShell();
        if (cancelled) {
          return;
        }

        setState({ loading: false, shellData: shellModule.default, bodyData: null, error: null });

        fetchJson(readerDocumentMeta.bodyUrl)
          .then((bodyPayload) => {
            if (cancelled) {
              return;
            }

            setState((current) => ({
              ...current,
              bodyData: bodyPayload,
            }));
          })
          .catch((error) => {
            if (!cancelled) {
              setState((current) => ({
                ...current,
                error,
              }));
            }
          });
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, shellData: null, bodyData: null, error });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [readerDocumentMeta]);

  const activeId = useActiveHeading(state.shellData?.outline ?? []);

  useEffect(() => {
    if (!state.bodyData || !articleRef.current) {
      return;
    }

    renderMermaid(articleRef.current).catch((error) => {
      console.error('Mermaid render failed', error);
    });
  }, [state.bodyData, theme]);

  useEffect(() => {
    const navigationState = location.state?.searchNavigation;
    if (!navigationState || !state.bodyData || !articleRef.current) {
      return;
    }

    const root = articleRef.current;
    clearSearchHighlights(root);

    let target = null;
    if (navigationState.targetId) {
      target = root.querySelector(`[data-search-target-id="${CSS.escape(navigationState.targetId)}"]`);
    }

    if (!target && navigationState.headingId) {
      target = document.getElementById(navigationState.headingId);
    }

    if (target) {
      scrollIntoViewWithOffset(target);
      if (navigationState.term) {
        highlightElementText(target, navigationState.term);
      } else {
        target.classList.add('doc-search-hit');
      }

      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = window.setTimeout(() => {
        if (articleRef.current) {
          clearSearchHighlights(articleRef.current);
        }
      }, SEARCH_HIGHLIGHT_DURATION_MS);
    }

    navigate(
      {
        pathname: location.pathname,
        hash: navigationState.headingId ? `#${navigationState.headingId}` : location.hash,
      },
      { replace: true, state: null },
    );
  }, [location, navigate, state.bodyData]);

  if (state.loading) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>{readerDocumentMeta.title}</h1>
          <p>Loading document shell and article body…</p>
        </div>
      </section>
    );
  }

  if (state.error || !state.shellData) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>Document failed to load</h1>
          <p>{String(state.error)}</p>
        </div>
      </section>
    );
  }

  const readerDocument = state.shellData;
  const heroSummary = readerDocument.summary;

  return (
    <section className="doc-page-shell">
      <div className="doc-page-topbar">
        <Link to="/" className="doc-index-link">Deep Research Library</Link>
      </div>

      <section className={`doc-view${outlineCollapsed ? ' outline-hidden' : ''}`}>
        <div className="doc-main">
          <header className="doc-hero">
            <Link to="/" className="back-link">
              ← All documents
            </Link>
            <MetadataPills document={readerDocument} />
            <div className="doc-hero-copy">
              <h1>{readerDocument.title}</h1>
            </div>
            {heroSummary ? (
              <aside className="doc-hero-summary">
                <div className="doc-hero-summary-label">Document Brief</div>
                <p className="doc-summary">{heroSummary}</p>
              </aside>
            ) : null}
          </header>

          <article
            ref={articleRef}
            className="doc-article"
            dangerouslySetInnerHTML={state.bodyData ? { __html: state.bodyData.html } : undefined}
          >
            {state.bodyData ? null : (
              <div className="doc-body-loading">
                <span className="hero-kicker">Loading Body</span>
                <p>Rendering the full article body…</p>
              </div>
            )}
          </article>
        </div>

        <OutlinePanel
          outline={readerDocument.outline}
          activeId={activeId}
          collapsed={outlineCollapsed}
          onToggle={() => setOutlineCollapsed((current) => !current)}
        />
      </section>
    </section>
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
