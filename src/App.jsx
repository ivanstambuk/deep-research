import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import manifest from './generated/reader-manifest.json';
import 'katex/dist/katex.min.css';
import './index.css';

const documentLoaders = import.meta.glob('./generated/documents/*.json');
const THEME_STORAGE_KEY = 'dr-reader-theme';

const documents = manifest
  .map((entry) => ({
    ...entry,
    load: documentLoaders[`./generated/documents/${entry.slug}.json`],
  }))
  .filter((entry) => entry.load)
  .sort((left, right) => left.order - right.order);

let mermaidModulePromise = null;

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

function OverviewPage() {
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
            <span>{documents.reduce((total, document) => total + document.lineCount, 0).toLocaleString()}</span>
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
            <span className="document-card-cta">Open document →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function OutlinePanel({ outline, activeId, collapsed, onToggle }) {
  const tree = useMemo(() => buildOutlineTree(outline ?? []), [outline]);
  const chapterIds = useMemo(
    () => tree.filter((node) => node.level === 2 && node.children.length > 0).map((node) => node.id),
    [tree],
  );
  const navRef = useRef(null);
  const hasHandledInitialActiveRef = useRef(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  if (!tree.length) {
    return null;
  }

  useEffect(() => {
    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    hasHandledInitialActiveRef.current = false;
    const initialPath = hashId ? findOutlinePath(tree, hashId) : null;
    setExpandedIds(new Set(initialPath ?? []));
  }, [tree]);

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
      const activeChapterId = chapterIds.find((id) => path.includes(id));

      if (activeChapterId) {
        chapterIds.forEach((id) => {
          if (id !== activeChapterId) {
            next.delete(id);
          }
        });
      }

      path.forEach((id) => next.add(id));
      return next;
    });

    if (!navRef.current) {
      return;
    }

    const activeLink = navRef.current.querySelector(`[data-outline-id="${activeId}"]`);
    if (activeLink) {
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId, chapterIds, tree]);

  const toggleBranch = (nodeId, level) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      const isChapter = level === 2 && chapterIds.includes(nodeId);

      if (!isChapter) {
        return next;
      }

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        chapterIds.forEach((id) => next.delete(id));
        next.add(nodeId);
      }

      return next;
    });
  };

  const handleLinkClick = (node) => {
    if (node.level === 2 && node.children.length) {
      toggleBranch(node.id, node.level);
    }

    const target = document.getElementById(node.id);
    if (!target) {
      return;
    }

    window.history.replaceState(null, '', `#${node.id}`);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderNodes = (nodes) => (
    <div className="outline-group">
      {nodes.map((node) => {
        const expanded = expandedIds.has(node.id);
        const hasChildren = node.children.length > 0;

        return (
          <div key={node.id} className={`outline-item level-${node.level}`}>
            <div className={`outline-row${node.level === 2 ? ' is-clickable' : ''}`}>
              {hasChildren && node.level === 2 ? (
                <button
                  type="button"
                  className={`outline-branch-toggle${expanded ? ' is-expanded' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleBranch(node.id, node.level);
                  }}
                  aria-label={expanded ? `Collapse ${node.text}` : `Expand ${node.text}`}
                >
                  ▸
                </button>
              ) : (
                <span className="outline-branch-spacer" />
              )}
              {node.level === 2 ? (
                <div
                  data-outline-id={node.id}
                  className={`outline-link level-${node.level}${activeId === node.id ? ' is-active' : ''}`}
                  onClick={() => handleLinkClick(node)}
                >
                  {node.text}
                </div>
              ) : (
                <button
                  type="button"
                  data-outline-id={node.id}
                  className={`outline-link level-${node.level}${activeId === node.id ? ' is-active' : ''}`}
                  onClick={() => handleLinkClick(node)}
                >
                  {node.text}
                </button>
              )}
            </div>
            {hasChildren && (node.level !== 2 || expanded) ? renderNodes(node.children) : null}
          </div>
        );
      })}
    </div>
  );

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
        <div className="outline-heading">On This Page</div>
        <nav ref={navRef} className="outline-nav">
          {renderNodes(tree)}
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

function DocumentPage({ document, theme }) {
  const articleRef = useRef(null);
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [state, setState] = useState({
    loading: true,
    documentData: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    window.scrollTo({ top: 0 });

    async function load() {
      setState({ loading: true, documentData: null, error: null });

      try {
        const module = await document.load();
        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          documentData: module.default,
          error: null,
        });
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, documentData: null, error });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [document]);

  const activeId = useActiveHeading(state.documentData?.outline ?? []);

  useEffect(() => {
    if (!state.documentData || !articleRef.current) {
      return;
    }

    renderMermaid(articleRef.current).catch((error) => {
      console.error('Mermaid render failed', error);
    });
  }, [state.documentData, theme]);

  if (state.loading) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{document.drId}</span>
          <h1>{document.title}</h1>
          <p>Loading document body and outline…</p>
        </div>
      </section>
    );
  }

  if (state.error || !state.documentData) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{document.drId}</span>
          <h1>Document failed to load</h1>
          <p>{String(state.error)}</p>
        </div>
      </section>
    );
  }

  const readerDocument = state.documentData;
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
          dangerouslySetInnerHTML={{ __html: readerDocument.html }}
        />
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
  const [theme, setTheme] = useState(() => readInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors and keep the in-memory preference.
    }
  }, [theme]);

  return (
    <div className="reader-shell">
      <main className="content-shell">
        <div className="reader-toolbar">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          {documents.map((document) => (
            <Route
              key={document.slug}
              path={`/${document.slug}`}
              element={<DocumentPage document={document} theme={theme} />}
            />
          ))}
        </Routes>
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
