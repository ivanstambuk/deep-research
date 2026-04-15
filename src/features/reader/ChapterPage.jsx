import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { READER_SCROLL_OFFSET } from './constants.js';
import { renderMermaid } from './mermaid.js';
import { scrollIntoViewWithOffset } from './scroll.js';
import { useActiveHeading } from './useOutlineSync.js';

const NAV_WIDTH_STORAGE_KEY = 'dr-reader-nav-width';
const NAV_WIDTH_EXPLICIT_STORAGE_KEY = 'dr-reader-nav-width-explicit';
const NAV_COLLAPSED_STORAGE_KEY = 'dr-reader-nav-collapsed';
const NAV_MIN_WIDTH = 240;
const NAV_MAX_WIDTH = 520;
const NAV_DEFAULT_WIDTH = 280;
const NAV_COLLAPSED_WIDTH = 54;
const NAV_RESIZER_GUTTER = 12;

function findChapter(shellDocument, chapterId) {
  return shellDocument?.chapters?.find((chapter) => chapter.chapterId === chapterId) ?? null;
}

function findChapterTitle(shellDocument, chapterId) {
  return findChapter(shellDocument, chapterId)?.title ?? chapterId ?? '';
}

function clampNavWidth(value) {
  return Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, value));
}

function readStoredNavWidth() {
  if (typeof window === 'undefined') {
    return NAV_DEFAULT_WIDTH;
  }

  const raw = Number(window.localStorage.getItem(NAV_WIDTH_STORAGE_KEY));
  return Number.isFinite(raw) ? clampNavWidth(raw) : NAV_DEFAULT_WIDTH;
}

function readStoredNavCollapsed() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === 'true';
}

function readStoredNavWidthExplicit() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(NAV_WIDTH_EXPLICIT_STORAGE_KEY) === 'true';
}

function buildChapterNavEntries(shellDocument) {
  const chapters = shellDocument?.chapters ?? [];
  const outlineLevelById = new Map((shellDocument?.outline ?? []).map((entry) => [entry.id, entry.level]));

  return chapters.map((entry, index) => {
    const level = outlineLevelById.get(entry.primaryHeadingId) ?? 3;
    const nextEntry = chapters[index + 1] ?? null;
    const nextLevel = nextEntry ? (outlineLevelById.get(nextEntry.primaryHeadingId) ?? 3) : null;

    const isGroupHeading = level === 2 && nextLevel === 3;

    return {
      ...entry,
      level,
      isGroupHeading,
    };
  });
}

function getHashTarget(hash) {
  const hashId = decodeURIComponent(String(hash ?? '').replace(/^#/, ''));
  if (!hashId) {
    return null;
  }

  return document.getElementById(hashId);
}

function alignHashTarget(hash, behavior = 'auto') {
  const target = getHashTarget(hash);
  if (!target) {
    return false;
  }

  scrollIntoViewWithOffset(target, READER_SCROLL_OFFSET, behavior);
  return true;
}

export default function ChapterPage({ readerDocumentMeta, layoutWidthMode = 'standard' }) {
  const { chapterId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);
  const resizeStateRef = useRef(null);
  const [shellDocument, setShellDocument] = useState(null);
  const [shellError, setShellError] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterError, setChapterError] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [navWidth, setNavWidth] = useState(readStoredNavWidth);
  const [navWidthExplicit, setNavWidthExplicit] = useState(readStoredNavWidthExplicit);
  const [navCollapsed, setNavCollapsed] = useState(readStoredNavCollapsed);
  const [navResizing, setNavResizing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShellDocument(null);
    setShellError(null);

    readerDocumentMeta.loadShell()
      .then((module) => {
        if (cancelled) {
          return;
        }
        setShellDocument(module.default ?? module);
      })
      .catch((error) => {
        if (!cancelled) {
          setShellError(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [readerDocumentMeta]);

  const chapterNavEntries = useMemo(
    () => buildChapterNavEntries(shellDocument),
    [shellDocument],
  );
  const requestedChapterEntry = useMemo(
    () => chapterNavEntries.find((entry) => entry.chapterId === chapterId) ?? null,
    [chapterId, chapterNavEntries],
  );
  const isGroupChapter = requestedChapterEntry?.isGroupHeading ?? false;
  const chapterMeta = useMemo(
    () => findChapter(shellDocument, chapterId),
    [chapterId, shellDocument],
  );

  useEffect(() => {
    let cancelled = false;
    setChapterError(null);
    setChapterLoading(true);

    if (!shellDocument || !chapterMeta?.modulePath) {
      if (shellDocument && !chapterMeta) {
        setChapterError(new Error(`Unknown chapter: ${chapterId}`));
      }
      setChapterLoading(false);
      return () => {
        cancelled = true;
      };
    }

    readerDocumentMeta.loadChapter(chapterMeta.modulePath)
      .then((module) => {
        if (cancelled) {
          return;
        }
        setChapter(module.default ?? module);
        setChapterLoading(false);
      })
      .catch((error) => {
        if (!cancelled) {
          setChapterError(error);
          setChapterLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, chapterMeta, readerDocumentMeta, shellDocument]);

  const isCurrentChapterReady = chapter?.chapterId === chapterId;
  const shouldRenderArticle = isCurrentChapterReady && !chapterError;
  const headingIds = useMemo(
    () => (isCurrentChapterReady ? (chapter?.headings?.map((heading) => heading.id).filter(Boolean) ?? []) : []),
    [chapter, isCurrentChapterReady],
  );
  const chapterHeadings = isCurrentChapterReady ? (chapter?.headings ?? []) : [];
  const activeHeadingId = useActiveHeading(headingIds);

  useEffect(() => {
    if (!shouldRenderArticle) {
      return;
    }

    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (!getHashTarget(location.hash)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      alignHashTarget(location.hash, 'auto');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, shouldRenderArticle]);

  useEffect(() => {
    if (!shouldRenderArticle || !articleRef.current) {
      return undefined;
    }

    let cancelled = false;
    let postRenderFrame = null;
    let postRenderFrame2 = null;

    renderMermaid(articleRef.current, {
      sectionId: chapter.chapterId,
    })
      .then(() => {
        if (cancelled) {
          return;
        }

        const currentHash = window.location.hash;
        if (!currentHash || !getHashTarget(currentHash)) {
          return;
        }

        // Mermaid can expand content above the hash target after the initial
        // browser/reader jump. Realign once rendering has settled.
        postRenderFrame = window.requestAnimationFrame(() => {
          postRenderFrame2 = window.requestAnimationFrame(() => {
            alignHashTarget(currentHash, 'auto');
          });
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Mermaid render failed', error);
        }
      });

    return () => {
      cancelled = true;
      if (postRenderFrame != null) {
        window.cancelAnimationFrame(postRenderFrame);
      }
      if (postRenderFrame2 != null) {
        window.cancelAnimationFrame(postRenderFrame2);
      }
    };
  }, [chapter, shouldRenderArticle]);

  useEffect(() => {
    if (!shouldRenderArticle || !articleRef.current) {
      return undefined;
    }

    const articleNode = articleRef.current;

    const handleArticleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = event.target instanceof Element
        ? event.target.closest('a[data-doc-xref="true"]')
        : null;

      if (!anchor) {
        return;
      }

      const targetSlug = anchor.getAttribute('data-doc-slug') || readerDocumentMeta.slug;
      const targetChapterId = anchor.getAttribute('data-doc-chapter-id');
      const targetHeadingId = anchor.getAttribute('data-doc-heading-id');

      if (!targetChapterId) {
        return;
      }

      event.preventDefault();

      navigate({
        pathname: `/${targetSlug}/${targetChapterId}`,
        hash: targetHeadingId ? `#${targetHeadingId}` : '',
      });

      if (targetChapterId === chapterId && targetHeadingId) {
        const target = document.getElementById(targetHeadingId);
        if (target) {
          scrollIntoViewWithOffset(target, READER_SCROLL_OFFSET, 'auto');
        }
      }
    };

    articleNode.addEventListener('click', handleArticleClick);
    return () => {
      articleNode.removeEventListener('click', handleArticleClick);
    };
  }, [chapterId, navigate, readerDocumentMeta.slug, shouldRenderArticle]);

  useEffect(() => {
    if (!navWidthExplicit) {
      return;
    }

    window.localStorage.setItem(NAV_WIDTH_STORAGE_KEY, String(navWidth));
  }, [navWidth, navWidthExplicit]);

  useEffect(() => {
    window.localStorage.setItem(NAV_WIDTH_EXPLICIT_STORAGE_KEY, navWidthExplicit ? 'true' : 'false');
  }, [navWidthExplicit]);

  useEffect(() => {
    window.localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, navCollapsed ? 'true' : 'false');
  }, [navCollapsed]);

  useEffect(() => {
    if (!navResizing) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const current = resizeStateRef.current;
      if (!current) {
        return;
      }

      const delta = event.clientX - current.startX;
      setNavWidth(clampNavWidth(current.startWidth + delta));
    };

    const stopResize = () => {
      resizeStateRef.current = null;
      setNavResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [navResizing]);

  useEffect(() => {
    if (!navResizing) {
      return undefined;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [navResizing]);

  const handleNavToggle = () => {
    setNavCollapsed((current) => !current);
  };

  const handleNavResizeStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: navWidth,
    };
    setNavWidthExplicit(true);
    setNavCollapsed(false);
    setNavResizing(true);
  };

  const handleHeadingNavigation = (headingId) => {
    const target = document.getElementById(headingId);
    navigate({
      pathname: `/${readerDocumentMeta.slug}/${chapterId}`,
      hash: `#${headingId}`,
    });
    if (target) {
      scrollIntoViewWithOffset(target, READER_SCROLL_OFFSET, 'auto');
    }
  };

  if (shellError) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <h1>{readerDocumentMeta.title}</h1>
          <p>{String(shellError)}</p>
        </div>
      </section>
    );
  }

  if (!shellDocument) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>{readerDocumentMeta.title}</h1>
          <p>Loading document shell…</p>
        </div>
      </section>
    );
  }

  const activeChapterEntry = requestedChapterEntry ?? chapterMeta;
  const previousChapterTitle = findChapterTitle(shellDocument, activeChapterEntry?.prevChapterId);
  const nextChapterTitle = findChapterTitle(shellDocument, activeChapterEntry?.nextChapterId);

  return (
    <section
      className={`chapter-reader page-shell${navCollapsed ? ' nav-collapsed' : ''}${navResizing ? ' is-resizing-nav' : ''}`}
      data-layout-width={layoutWidthMode}
      style={{
        '--chapter-nav-width': navCollapsed
          ? `${NAV_COLLAPSED_WIDTH}px`
          : (navWidthExplicit ? `${navWidth}px` : 'var(--reader-nav-recommended-width)'),
        '--chapter-nav-collapsed-width': `${NAV_COLLAPSED_WIDTH}px`,
        '--chapter-nav-resizer-width': `${navCollapsed ? 0 : NAV_RESIZER_GUTTER}px`,
      }}
    >
      <aside className="chapter-nav-sidebar">
        <div className={`chapter-nav-shell${navCollapsed ? ' is-collapsed' : ''}`}>
          <div className="chapter-nav-toolbar">
            <button
              type="button"
              className="toolbar-button chapter-nav-toggle"
              onClick={handleNavToggle}
              aria-label={navCollapsed ? 'Show chapter navigation' : 'Hide chapter navigation'}
              aria-pressed={!navCollapsed}
              title={navCollapsed ? 'Show chapter navigation' : 'Hide chapter navigation'}
            >
              ☰
            </button>
          </div>
          <div className="chapter-nav-card">
            <div className="chapter-nav-header">
              <Link to="/" className="chapter-index-link">Deep Research Library</Link>
              <div className="chapter-nav-document-title">{readerDocumentMeta.title}</div>
            </div>
            <nav className="chapter-nav-list" aria-label="Document chapters">
              {chapterNavEntries.map((entry) => (
                <Link
                  key={entry.chapterId}
                  to={`/${readerDocumentMeta.slug}/${entry.chapterId}`}
                  className={`chapter-nav-link${entry.chapterId === chapterId ? ' is-active' : ''}${entry.isGroupHeading ? ' is-group-heading' : ''}${entry.level >= 3 ? ' is-nested' : ''}`}
                >
                  {entry.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      <div className="chapter-nav-resizer-slot" aria-hidden={navCollapsed}>
        <button
          type="button"
          className="chapter-nav-resizer"
          onPointerDown={handleNavResizeStart}
          aria-label="Resize chapter navigation"
          title="Resize chapter navigation"
          tabIndex={navCollapsed ? -1 : 0}
        />
      </div>

      <div className="chapter-main-column">
        {chapterError ? (
          <div className="loading-card chapter-loading-card">
            <span className="hero-kicker">{readerDocumentMeta.drId}</span>
            <h1>{readerDocumentMeta.title}</h1>
            <p>{String(chapterError)}</p>
          </div>
        ) : shouldRenderArticle ? (
          <article
            ref={articleRef}
            className={`doc-article chapter-article${isGroupChapter ? ' is-group-chapter' : ''}`}
            dangerouslySetInnerHTML={{ __html: chapter.html }}
          />
        ) : (
          <div className="loading-card chapter-loading-card">
            <span className="hero-kicker">{readerDocumentMeta.drId}</span>
            <h1>{activeChapterEntry?.title ?? readerDocumentMeta.title}</h1>
            <p>{chapterLoading ? 'Loading chapter…' : 'Preparing chapter…'}</p>
          </div>
        )}

        <nav className="chapter-pager" aria-label="Cross chapter navigation">
          {activeChapterEntry?.prevChapterId ? (
            <Link className="chapter-pager-link is-prev" to={`/${readerDocumentMeta.slug}/${activeChapterEntry.prevChapterId}`}>
              ← {previousChapterTitle}
            </Link>
          ) : <span />}
          {activeChapterEntry?.nextChapterId ? (
            <Link className="chapter-pager-link is-next" to={`/${readerDocumentMeta.slug}/${activeChapterEntry.nextChapterId}`}>
              {nextChapterTitle} →
            </Link>
          ) : <span />}
        </nav>
      </div>

      <aside className="chapter-outline-sidebar">
        <div className="chapter-outline-card">
          <div className="chapter-outline-heading">Table of contents</div>
          <nav className="chapter-outline-list" aria-label="Chapter headings">
            {chapterHeadings.map((heading) => (
              <button
                key={heading.id}
                type="button"
                className={`chapter-outline-link level-${heading.level ?? 3}${activeHeadingId === heading.id ? ' is-active' : ''}`}
                onClick={() => handleHeadingNavigation(heading.id)}
              >
                {heading.text}
              </button>
            ))}
            {!chapterHeadings.length && (
              <div className="chapter-outline-empty">
                {chapterLoading ? 'Loading chapter headings…' : 'No headings available.'}
              </div>
            )}
          </nav>
        </div>
      </aside>
    </section>
  );
}
