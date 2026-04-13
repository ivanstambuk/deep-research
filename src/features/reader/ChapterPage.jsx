import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { READER_SCROLL_OFFSET } from './constants.js';
import { renderMermaid } from './mermaid.js';
import { scrollIntoViewWithOffset } from './scroll.js';
import { useActiveHeading } from './useOutlineSync.js';

function findChapter(shellDocument, chapterId) {
  return shellDocument?.chapters?.find((chapter) => chapter.chapterId === chapterId) ?? null;
}

function findChapterTitle(shellDocument, chapterId) {
  return findChapter(shellDocument, chapterId)?.title ?? chapterId ?? '';
}

export default function ChapterPage({ readerDocumentMeta }) {
  const { chapterId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);
  const [shellDocument, setShellDocument] = useState(null);
  const [shellError, setShellError] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterError, setChapterError] = useState(null);

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

  const chapterMeta = useMemo(
    () => findChapter(shellDocument, chapterId),
    [chapterId, shellDocument],
  );

  useEffect(() => {
    let cancelled = false;
    setChapter(null);
    setChapterError(null);

    if (!shellDocument || !chapterMeta?.modulePath) {
      if (shellDocument && !chapterMeta) {
        setChapterError(new Error(`Unknown chapter: ${chapterId}`));
      }
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
      })
      .catch((error) => {
        if (!cancelled) {
          setChapterError(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, chapterMeta, readerDocumentMeta, shellDocument]);

  const headingIds = useMemo(
    () => chapter?.headings?.map((heading) => heading.id).filter(Boolean) ?? [],
    [chapter],
  );
  const chapterHeadings = chapter?.headings ?? [];
  const activeHeadingId = useActiveHeading(headingIds);

  useEffect(() => {
    if (!chapter) {
      return;
    }

    const hashId = decodeURIComponent(String(location.hash ?? '').replace(/^#/, ''));
    if (!hashId) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const target = document.getElementById(hashId);
    if (!target) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollIntoViewWithOffset(target, READER_SCROLL_OFFSET, 'auto');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chapter, location.hash]);

  useEffect(() => {
    if (!chapter || !articleRef.current) {
      return undefined;
    }

    let cancelled = false;

    renderMermaid(articleRef.current, {
      sectionId: chapter.chapterId,
    }).catch((error) => {
      if (!cancelled) {
        console.error('Mermaid render failed', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chapter]);

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

  if (chapterError) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>{readerDocumentMeta.title}</h1>
          <p>{String(chapterError)}</p>
        </div>
      </section>
    );
  }

  if (!chapter) {
    return (
      <section className="doc-loading doc-page-shell">
        <div className="loading-card">
          <span className="hero-kicker">{readerDocumentMeta.drId}</span>
          <h1>{readerDocumentMeta.title}</h1>
          <p>Loading chapter…</p>
        </div>
      </section>
    );
  }

  const previousChapterTitle = findChapterTitle(shellDocument, chapter.prevChapterId);
  const nextChapterTitle = findChapterTitle(shellDocument, chapter.nextChapterId);

  return (
    <section className="chapter-reader page-shell">
      <aside className="chapter-nav-sidebar">
        <div className="chapter-nav-card">
          <div className="chapter-nav-header">
            <Link to="/" className="chapter-index-link">Deep Research Library</Link>
            <div className="chapter-nav-document-title">{readerDocumentMeta.title}</div>
          </div>
          <nav className="chapter-nav-list" aria-label="Document chapters">
            {shellDocument.chapters.map((entry) => (
              <Link
                key={entry.chapterId}
                to={`/${readerDocumentMeta.slug}/${entry.chapterId}`}
                className={`chapter-nav-link${entry.chapterId === chapter.chapterId ? ' is-active' : ''}`}
              >
                {entry.title}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="chapter-main-column">
        <article
          ref={articleRef}
          className="doc-article chapter-article"
          dangerouslySetInnerHTML={{ __html: chapter.html }}
        />

        <nav className="chapter-pager" aria-label="Cross chapter navigation">
          {chapter.prevChapterId ? (
            <Link className="chapter-pager-link is-prev" to={`/${readerDocumentMeta.slug}/${chapter.prevChapterId}`}>
              ← {previousChapterTitle}
            </Link>
          ) : <span />}
          {chapter.nextChapterId ? (
            <Link className="chapter-pager-link is-next" to={`/${readerDocumentMeta.slug}/${chapter.nextChapterId}`}>
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
          </nav>
        </div>
      </aside>
    </section>
  );
}
