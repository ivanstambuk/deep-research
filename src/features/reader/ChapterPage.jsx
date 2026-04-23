import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { READER_SCROLL_OFFSET } from './constants.js';
import {
  canCopyMermaidPngToClipboard,
  copyMermaidPngToClipboard,
  copyMermaidSourceToClipboard,
  downloadMermaidPng,
  getMermaidPngFileName,
  renderMermaid,
  renderMermaidDiagram,
  setInlineMermaidZoom,
  setRenderedMermaidZoom,
} from './mermaid.js';
import { scrollIntoViewWithOffset } from './scroll.js';
import { useActiveHeading } from './useOutlineSync.js';

const NAV_WIDTH_STORAGE_KEY = 'dr-reader-nav-width';
const NAV_WIDTH_EXPLICIT_STORAGE_KEY = 'dr-reader-nav-width-explicit';
const NAV_COLLAPSED_STORAGE_KEY = 'dr-reader-nav-collapsed';
const OUTLINE_WIDTH_STORAGE_KEY = 'dr-reader-outline-width';
const OUTLINE_WIDTH_EXPLICIT_STORAGE_KEY = 'dr-reader-outline-width-explicit';
const NAV_MIN_WIDTH = 240;
const NAV_MAX_WIDTH = 520;
const NAV_DEFAULT_WIDTH = 280;
const NAV_COLLAPSED_WIDTH = 54;
const NAV_RESIZER_GUTTER = 12;
const OUTLINE_MIN_WIDTH = 240;
const OUTLINE_MAX_WIDTH = 520;
const OUTLINE_DEFAULT_WIDTH = 280;
const OUTLINE_RESIZER_GUTTER = 12;
const MERMAID_MODAL_TITLE_ID = 'reader-mermaid-modal-title';
const MERMAID_ACTION_FEEDBACK_RESET_MS = 1800;
const MERMAID_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
const DEFAULT_MERMAID_ACTION_FEEDBACK = {
  source: 'idle',
  image: 'idle',
  download: 'idle',
};

function findChapter(shellDocument, chapterId) {
  return shellDocument?.chapters?.find((chapter) => chapter.chapterId === chapterId) ?? null;
}

function findChapterTitle(shellDocument, chapterId) {
  return findChapter(shellDocument, chapterId)?.title ?? chapterId ?? '';
}

function clampNavWidth(value) {
  return Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, value));
}

function clampOutlineWidth(value) {
  return Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, value));
}

function clampMermaidZoom(value) {
  return Math.min(200, Math.max(50, value));
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

function readStoredOutlineWidth() {
  if (typeof window === 'undefined') {
    return OUTLINE_DEFAULT_WIDTH;
  }

  const raw = Number(window.localStorage.getItem(OUTLINE_WIDTH_STORAGE_KEY));
  return Number.isFinite(raw) ? clampOutlineWidth(raw) : OUTLINE_DEFAULT_WIDTH;
}

function readStoredOutlineWidthExplicit() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(OUTLINE_WIDTH_EXPLICIT_STORAGE_KEY) === 'true';
}

function buildChapterNavEntries(shellDocument) {
  const chapters = shellDocument?.chapters ?? [];
  const outlineLevelById = new Map((shellDocument?.outline ?? []).map((entry) => [entry.id, entry.level]));

  return chapters.map((entry, index) => {
    const level = entry.outlineLevel ?? outlineLevelById.get(entry.primaryHeadingId) ?? 3;
    const nextEntry = chapters[index + 1] ?? null;
    const nextLevel = nextEntry
      ? (nextEntry.outlineLevel ?? outlineLevelById.get(nextEntry.primaryHeadingId) ?? 3)
      : null;

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

function getFocusableMermaidModalNodes(container) {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return Array.from(container.querySelectorAll(MERMAID_FOCUSABLE_SELECTOR))
    .filter((node) => node instanceof HTMLElement && !node.hasAttribute('disabled') && node.tabIndex !== -1);
}

function getMermaidActionLabel(action, status) {
  if (status === 'success') {
    if (action === 'source') {
      return 'Copied source';
    }
    if (action === 'image') {
      return 'Copied image';
    }
    return 'Downloaded PNG';
  }

  if (status === 'error') {
    if (action === 'download') {
      return 'Download failed';
    }
    return 'Copy failed';
  }

  if (action === 'source') {
    return 'Copy source';
  }

  if (action === 'image') {
    return 'Copy image';
  }

  return 'Download PNG';
}

export default function ChapterPage({
  readerDocumentMeta,
  layoutWidthMode = 'standard',
  theme = 'dark',
  globalMermaidZoomPercent = 60,
  onGlobalMermaidZoomChange = () => {},
}) {
  const { chapterId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);
  const navResizeStateRef = useRef(null);
  const outlineResizeStateRef = useRef(null);
  const mermaidModalRef = useRef(null);
  const mermaidModalCloseButtonRef = useRef(null);
  const mermaidModalDiagramRef = useRef(null);
  const mermaidModalTriggerRef = useRef(null);
  const mermaidFeedbackTimeoutsRef = useRef({});
  const [shellDocument, setShellDocument] = useState(null);
  const [shellError, setShellError] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterError, setChapterError] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [navWidth, setNavWidth] = useState(readStoredNavWidth);
  const [navWidthExplicit, setNavWidthExplicit] = useState(readStoredNavWidthExplicit);
  const [navCollapsed, setNavCollapsed] = useState(readStoredNavCollapsed);
  const [navResizing, setNavResizing] = useState(false);
  const [outlineWidth, setOutlineWidth] = useState(readStoredOutlineWidth);
  const [outlineWidthExplicit, setOutlineWidthExplicit] = useState(readStoredOutlineWidthExplicit);
  const [outlineResizing, setOutlineResizing] = useState(false);
  const [expandedMermaid, setExpandedMermaid] = useState(null);
  const [expandedMermaidZoom, setExpandedMermaidZoom] = useState(clampMermaidZoom(globalMermaidZoomPercent));
  const [expandedMermaidReady, setExpandedMermaidReady] = useState(false);
  const [mermaidActionFeedback, setMermaidActionFeedback] = useState(DEFAULT_MERMAID_ACTION_FEEDBACK);

  const imageClipboardSupported = typeof window !== 'undefined' && canCopyMermaidPngToClipboard();

  function resolveInlineMermaidZoom() {
    return clampMermaidZoom(globalMermaidZoomPercent);
  }

  function getInlineMermaidZoomForContainer() {
    return resolveInlineMermaidZoom();
  }

  function syncInlineMermaidZoomsInDom({
    articleNode = articleRef.current,
    globalZoom = globalMermaidZoomPercent,
  } = {}) {
    if (!(articleNode instanceof HTMLElement)) {
      return;
    }

    articleNode.querySelectorAll('.mermaid[data-mermaid-source]').forEach((container) => {
      if (!(container instanceof HTMLElement)) {
        return;
      }

      const nextZoom = clampMermaidZoom(globalZoom);
      setInlineMermaidZoom(container, nextZoom);
    });
  }

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
  const activeChapterEntry = requestedChapterEntry ?? chapterMeta;

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
  const groupOutlineEntries = useMemo(
    () => (
      Array.isArray(activeChapterEntry?.groupChildren)
        ? activeChapterEntry.groupChildren.filter((entry) => entry?.chapterId && entry?.title)
        : []
    ),
    [activeChapterEntry],
  );
  const showGroupChapterToc = isGroupChapter && groupOutlineEntries.length >= 2;
  const outlineHeadingLabel = showGroupChapterToc ? 'Chapters in this group' : 'Table of contents';
  const outlineAriaLabel = showGroupChapterToc
    ? `Chapters in ${activeChapterEntry?.title ?? 'this group'}`
    : 'Chapter headings';

  useEffect(() => {
    const documentTitle = readerDocumentMeta?.title?.trim() || 'Deep Research Pro';
    const chapterTitle = chapterMeta?.title?.trim();

    document.title = chapterTitle
      ? `${chapterTitle} · ${documentTitle}`
      : documentTitle;
  }, [chapterMeta?.title, readerDocumentMeta?.title]);

  function clearMermaidFeedbackTimeouts() {
    Object.values(mermaidFeedbackTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    mermaidFeedbackTimeoutsRef.current = {};
  }

  function resetMermaidActionFeedback() {
    clearMermaidFeedbackTimeouts();
    setMermaidActionFeedback(DEFAULT_MERMAID_ACTION_FEEDBACK);
  }

  function scheduleMermaidActionFeedback(action, status) {
    clearTimeout(mermaidFeedbackTimeoutsRef.current[action]);
    setMermaidActionFeedback((current) => ({
      ...current,
      [action]: status,
    }));
    mermaidFeedbackTimeoutsRef.current[action] = window.setTimeout(() => {
      setMermaidActionFeedback((current) => ({
        ...current,
        [action]: 'idle',
      }));
      delete mermaidFeedbackTimeoutsRef.current[action];
    }, MERMAID_ACTION_FEEDBACK_RESET_MS);
  }

  function restoreMermaidTriggerFocus() {
    const triggerButton = mermaidModalTriggerRef.current;
    if (!(triggerButton instanceof HTMLElement)) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (triggerButton.isConnected) {
          triggerButton.focus({ preventScroll: true });
        }
      }, 0);
    });
  }

  function closeExpandedMermaid({ restoreFocus = true } = {}) {
    setExpandedMermaid(null);
    setExpandedMermaidReady(false);
    setExpandedMermaidZoom(clampMermaidZoom(globalMermaidZoomPercent));
    resetMermaidActionFeedback();
    if (restoreFocus) {
      restoreMermaidTriggerFocus();
    }
  }

  function openExpandedMermaidFromButton(button) {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const container = button.closest('.mermaid');
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const source = container.dataset.mermaidSource?.trim();
    if (!source) {
      return;
    }

    const initialZoom = getInlineMermaidZoomForContainer(container);

    mermaidModalTriggerRef.current = button;
    setExpandedMermaid({
      source,
      title: container.dataset.mermaidTitle || 'Mermaid diagram',
      fileStem: container.dataset.mermaidFileStem || 'mermaid-diagram',
      diagramId: container.dataset.mermaidDiagramId || '',
    });
    setExpandedMermaidZoom(initialZoom);
    setExpandedMermaidReady(false);
    resetMermaidActionFeedback();
  }

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
      theme,
      getZoomPercent: (node) => getInlineMermaidZoomForContainer(node),
    })
      .then(() => {
        if (cancelled) {
          return;
        }

        syncInlineMermaidZoomsInDom({ articleNode: articleRef.current });

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
  }, [chapter, shouldRenderArticle, theme]);

  useEffect(() => {
    if (!expandedMermaid || !mermaidModalDiagramRef.current) {
      return undefined;
    }

    let cancelled = false;
    setExpandedMermaidReady(false);

    renderMermaidDiagram(mermaidModalDiagramRef.current, {
      source: expandedMermaid.source,
      sectionId: chapter?.chapterId ?? chapterId,
      priority: 'target',
      theme,
      zoomPercent: expandedMermaidZoom,
    })
      .then(() => {
        if (cancelled) {
          return;
        }
        setRenderedMermaidZoom(mermaidModalDiagramRef.current, expandedMermaidZoom);
        setExpandedMermaidReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Expanded Mermaid render failed', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [expandedMermaid, theme, chapter?.chapterId, chapterId]);

  useEffect(() => {
    if (!expandedMermaid || !expandedMermaidReady || !mermaidModalDiagramRef.current) {
      return;
    }

    setRenderedMermaidZoom(mermaidModalDiagramRef.current, expandedMermaidZoom);
  }, [expandedMermaid, expandedMermaidReady, expandedMermaidZoom]);

  useEffect(() => {
    if (!expandedMermaid || !mermaidModalRef.current) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      (mermaidModalCloseButtonRef.current ?? mermaidModalRef.current)?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeExpandedMermaid();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableNodes = getFocusableMermaidModalNodes(mermaidModalRef.current);
      if (!focusableNodes.length) {
        event.preventDefault();
        mermaidModalRef.current?.focus();
        return;
      }

      const firstNode = focusableNodes[0];
      const lastNode = focusableNodes[focusableNodes.length - 1];

      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedMermaid]);

  useEffect(() => {
    return () => {
      clearMermaidFeedbackTimeouts();
    };
  }, []);

  useEffect(() => {
    if (!shouldRenderArticle) {
      return;
    }

    syncInlineMermaidZoomsInDom();
  }, [globalMermaidZoomPercent, shouldRenderArticle]);

  useEffect(() => {
    if (!shouldRenderArticle || !articleRef.current) {
      return undefined;
    }

    const articleNode = articleRef.current;

    const handleArticleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const mermaidActionButton = event.target instanceof Element
        ? event.target.closest('button[data-mermaid-action]')
        : null;

      if (mermaidActionButton instanceof HTMLButtonElement) {
        event.preventDefault();

        const mermaidAction = mermaidActionButton.dataset.mermaidAction ?? '';
        if (mermaidAction === 'expand') {
          openExpandedMermaidFromButton(mermaidActionButton);
          return;
        }

        if (mermaidAction === 'zoom-in' || mermaidAction === 'zoom-out') {
          const container = mermaidActionButton.closest('.mermaid');
          if (!(container instanceof HTMLElement)) {
            return;
          }

          const delta = mermaidAction === 'zoom-in' ? 10 : -10;
          const nextZoom = clampMermaidZoom(getInlineMermaidZoomForContainer(container) + delta);
          onGlobalMermaidZoomChange(nextZoom);
          syncInlineMermaidZoomsInDom({ globalZoom: nextZoom });
        }
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
  }, [
    chapterId,
    globalMermaidZoomPercent,
    navigate,
    onGlobalMermaidZoomChange,
    readerDocumentMeta.slug,
    shouldRenderArticle,
  ]);

  useEffect(() => {
    setExpandedMermaid(null);
    setExpandedMermaidReady(false);
    setExpandedMermaidZoom(clampMermaidZoom(globalMermaidZoomPercent));
    resetMermaidActionFeedback();
  }, [chapterId]);

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
      const current = navResizeStateRef.current;
      if (!current) {
        return;
      }

      const delta = event.clientX - current.startX;
      setNavWidth(clampNavWidth(current.startWidth + delta));
    };

    const stopResize = () => {
      navResizeStateRef.current = null;
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
    if (!outlineWidthExplicit) {
      return;
    }

    window.localStorage.setItem(OUTLINE_WIDTH_STORAGE_KEY, String(outlineWidth));
  }, [outlineWidth, outlineWidthExplicit]);

  useEffect(() => {
    window.localStorage.setItem(OUTLINE_WIDTH_EXPLICIT_STORAGE_KEY, outlineWidthExplicit ? 'true' : 'false');
  }, [outlineWidthExplicit]);

  useEffect(() => {
    if (!outlineResizing) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const current = outlineResizeStateRef.current;
      if (!current) {
        return;
      }

      const delta = event.clientX - current.startX;
      setOutlineWidth(clampOutlineWidth(current.startWidth - delta));
    };

    const stopResize = () => {
      outlineResizeStateRef.current = null;
      setOutlineResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [outlineResizing]);

  useEffect(() => {
    if (!navResizing && !outlineResizing) {
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
  }, [navResizing, outlineResizing]);

  const handleNavToggle = () => {
    setNavCollapsed((current) => !current);
  };

  const handleNavResizeStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    navResizeStateRef.current = {
      startX: event.clientX,
      startWidth: navWidth,
    };
    setNavWidthExplicit(true);
    setNavCollapsed(false);
    setNavResizing(true);
  };

  const handleOutlineResizeStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    outlineResizeStateRef.current = {
      startX: event.clientX,
      startWidth: outlineWidth,
    };
    setOutlineWidthExplicit(true);
    setOutlineResizing(true);
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

  const handleMermaidBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      closeExpandedMermaid();
    }
  };

  const expandedMermaidResetZoom = 60;

  const adjustExpandedMermaidZoom = (delta) => {
    const nextZoom = clampMermaidZoom(expandedMermaidZoom + delta);
    setExpandedMermaidZoom(nextZoom);
    onGlobalMermaidZoomChange(nextZoom);
    syncInlineMermaidZoomsInDom({ globalZoom: nextZoom });
  };

  const resetExpandedMermaidZoom = () => {
    setExpandedMermaidZoom(expandedMermaidResetZoom);
    onGlobalMermaidZoomChange(expandedMermaidResetZoom);
    syncInlineMermaidZoomsInDom({ globalZoom: expandedMermaidResetZoom });
  };

  const handleCopyMermaidSource = async () => {
    if (!expandedMermaid?.source) {
      return;
    }

    try {
      await copyMermaidSourceToClipboard(expandedMermaid.source);
      scheduleMermaidActionFeedback('source', 'success');
    } catch (error) {
      console.error('Failed to copy Mermaid source', error);
      scheduleMermaidActionFeedback('source', 'error');
    }
  };

  const handleCopyMermaidImage = async () => {
    if (!expandedMermaidReady || !imageClipboardSupported) {
      return;
    }

    const svgElement = mermaidModalDiagramRef.current?.querySelector('svg');
    if (!(svgElement instanceof SVGElement)) {
      scheduleMermaidActionFeedback('image', 'error');
      return;
    }

    try {
      await copyMermaidPngToClipboard(svgElement);
      scheduleMermaidActionFeedback('image', 'success');
    } catch (error) {
      console.error('Failed to copy Mermaid PNG image', error);
      scheduleMermaidActionFeedback('image', 'error');
    }
  };

  const handleDownloadMermaidPng = async () => {
    if (!expandedMermaidReady || !expandedMermaid) {
      return;
    }

    const svgElement = mermaidModalDiagramRef.current?.querySelector('svg');
    if (!(svgElement instanceof SVGElement)) {
      scheduleMermaidActionFeedback('download', 'error');
      return;
    }

    const fileName = getMermaidPngFileName({
      fileStem: expandedMermaid.fileStem,
      theme,
    });

    try {
      await downloadMermaidPng(svgElement, fileName);
      scheduleMermaidActionFeedback('download', 'success');
    } catch (error) {
      console.error('Failed to download Mermaid PNG', error);
      scheduleMermaidActionFeedback('download', 'error');
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

  const previousChapterTitle = findChapterTitle(shellDocument, activeChapterEntry?.prevChapterId);
  const nextChapterTitle = findChapterTitle(shellDocument, activeChapterEntry?.nextChapterId);

  return (
    <section
      className={`chapter-reader page-shell${navCollapsed ? ' nav-collapsed' : ''}${navResizing ? ' is-resizing-nav' : ''}${outlineResizing ? ' is-resizing-outline' : ''}`}
      data-layout-width={layoutWidthMode}
      style={{
        '--chapter-nav-width': navCollapsed
          ? `${NAV_COLLAPSED_WIDTH}px`
          : (navWidthExplicit ? `${navWidth}px` : 'var(--reader-nav-recommended-width)'),
        '--chapter-nav-collapsed-width': `${NAV_COLLAPSED_WIDTH}px`,
        '--chapter-nav-resizer-width': `${navCollapsed ? 0 : NAV_RESIZER_GUTTER}px`,
        '--chapter-outline-width': outlineWidthExplicit
          ? `${outlineWidth}px`
          : 'var(--reader-outline-recommended-width)',
        '--chapter-outline-resizer-width': `${OUTLINE_RESIZER_GUTTER}px`,
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
          <>
            <article
              ref={articleRef}
              className={`doc-article chapter-article${isGroupChapter ? ' is-group-chapter' : ''}`}
              dangerouslySetInnerHTML={{ __html: chapter.html }}
            />
            {showGroupChapterToc ? (
              <section className="chapter-group-card" aria-labelledby="chapter-group-card-heading">
                <div id="chapter-group-card-heading" className="chapter-group-card-heading">
                  Chapters in this group
                </div>
                <nav className="chapter-group-list" aria-label={outlineAriaLabel}>
                  {groupOutlineEntries.map((entry) => (
                    <Link
                      key={entry.chapterId}
                      to={`/${readerDocumentMeta.slug}/${entry.chapterId}`}
                      className="chapter-group-link"
                    >
                      <span className="chapter-group-link-title">{entry.title}</span>
                    </Link>
                  ))}
                </nav>
              </section>
            ) : null}
          </>
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

      <div className="chapter-outline-resizer-slot">
        <button
          type="button"
          className="chapter-outline-resizer"
          onPointerDown={handleOutlineResizeStart}
          aria-label="Resize chapter outline"
          title="Resize chapter outline"
        />
      </div>

      <aside className="chapter-outline-sidebar">
        <div className="chapter-outline-card">
          <div className="chapter-outline-heading">{outlineHeadingLabel}</div>
          <nav className="chapter-outline-list" aria-label={outlineAriaLabel}>
            {showGroupChapterToc ? (
              groupOutlineEntries.map((entry) => (
                <Link
                  key={entry.chapterId}
                  to={`/${readerDocumentMeta.slug}/${entry.chapterId}`}
                  className="chapter-outline-link level-3"
                >
                  {entry.title}
                </Link>
              ))
            ) : (
              chapterHeadings.map((heading) => (
                <button
                  key={heading.id}
                  type="button"
                  className={`chapter-outline-link level-${heading.level ?? 3}${activeHeadingId === heading.id ? ' is-active' : ''}`}
                  onClick={() => handleHeadingNavigation(heading.id)}
                >
                  {heading.text}
                </button>
              ))
            )}
            {!showGroupChapterToc && !chapterHeadings.length && (
              <div className="chapter-outline-empty">
                {chapterLoading ? 'Loading chapter headings…' : 'No headings available.'}
              </div>
            )}
          </nav>
        </div>
      </aside>

      {expandedMermaid ? (
        <div className="mermaid-modal-backdrop" onMouseDown={handleMermaidBackdropMouseDown}>
          <div
            ref={mermaidModalRef}
            className="mermaid-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={MERMAID_MODAL_TITLE_ID}
            tabIndex={-1}
          >
            <div className="mermaid-modal-header">
              <div className="mermaid-modal-title-group">
                <h2 id={MERMAID_MODAL_TITLE_ID}>{expandedMermaid.title}</h2>
                <div className="mermaid-modal-caption">
                  <span>{expandedMermaidZoom}%</span>
                  {!imageClipboardSupported ? (
                    <span>PNG copy unavailable in this browser</span>
                  ) : null}
                </div>
              </div>

              <div className="mermaid-modal-controls">
                <button
                  type="button"
                  className="mermaid-modal-button"
                  onClick={() => adjustExpandedMermaidZoom(-10)}
                  disabled={!expandedMermaidReady || expandedMermaidZoom <= 50}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  className="mermaid-modal-button"
                  onClick={resetExpandedMermaidZoom}
                  disabled={!expandedMermaidReady || expandedMermaidZoom === expandedMermaidResetZoom}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="mermaid-modal-button"
                  onClick={() => adjustExpandedMermaidZoom(10)}
                  disabled={!expandedMermaidReady || expandedMermaidZoom >= 200}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  className="mermaid-modal-button"
                  onClick={handleCopyMermaidSource}
                  disabled={!expandedMermaidReady}
                >
                  {getMermaidActionLabel('source', mermaidActionFeedback.source)}
                </button>
                <button
                  type="button"
                  className="mermaid-modal-button"
                  onClick={handleCopyMermaidImage}
                  disabled={!expandedMermaidReady || !imageClipboardSupported}
                >
                  {getMermaidActionLabel('image', mermaidActionFeedback.image)}
                </button>
                <button
                  type="button"
                  className="mermaid-modal-button"
                  onClick={handleDownloadMermaidPng}
                  disabled={!expandedMermaidReady}
                >
                  {getMermaidActionLabel('download', mermaidActionFeedback.download)}
                </button>
                <button
                  ref={mermaidModalCloseButtonRef}
                  type="button"
                  className="mermaid-modal-button is-close"
                  onClick={() => closeExpandedMermaid()}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mermaid-modal-body">
              <div
                ref={mermaidModalDiagramRef}
                className="mermaid mermaid-modal-diagram"
                data-mermaid-source={expandedMermaid.source}
                data-mermaid-title={expandedMermaid.title}
                data-mermaid-file-stem={expandedMermaid.fileStem}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
