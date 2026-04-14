import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import manifest from './generated/reader-manifest.json';
import ChapterPage from './features/reader/ChapterPage.jsx';
import 'katex/dist/katex.min.css';
import './index.css';

const documentLoaders = import.meta.glob('./generated/documents/*.json');
const chapterLoaders = import.meta.glob('./generated/chapters/**/*.json');
const THEME_STORAGE_KEY = 'dr-reader-theme';
const TEXT_SIZE_STORAGE_KEY = 'dr-reader-text-size';
const LAYOUT_WIDTH_STORAGE_KEY = 'dr-reader-layout-width';
const TEXT_SIZE_OPTIONS = ['small', 'standard', 'large'];
const LAYOUT_WIDTH_OPTIONS = ['standard', 'wide', 'comfort'];
const ROUTER_BASENAME = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

const documents = (manifest.documents ?? [])
  .map((entry) => ({
    ...entry,
    loadShell: documentLoaders[`./generated/documents/${entry.slug}.json`],
    loadChapter: (modulePath) => {
      const loader = chapterLoaders[modulePath];
      if (!loader) {
        throw new Error(`Missing generated chapter payload for ${modulePath}`);
      }
      return loader();
    },
  }))
  .filter((entry) => entry.loadShell)
  .sort((left, right) => left.order - right.order);

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

function resolveRecommendedLayoutWidth(viewportWidth) {
  if (viewportWidth >= 1400) {
    return 'wide';
  }

  return 'standard';
}

function normalizeLayoutWidthPreference(value) {
  if (value === 'recommended' || LAYOUT_WIDTH_OPTIONS.includes(value)) {
    return value;
  }

  return null;
}

function readInitialLayoutWidthPreference() {
  try {
    const stored = normalizeLayoutWidthPreference(window.localStorage.getItem(LAYOUT_WIDTH_STORAGE_KEY));
    if (stored) {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to default.
  }

  return 'recommended';
}

function OverviewPage() {
  return (
    <section className="overview-page page-shell">
      <div className="document-grid library-grid">
        {documents.map((document) => (
          <Link key={document.slug} to={`/${document.slug}/${document.firstChapterId}`} className="document-card">
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

function AppShell() {
  const [theme, setTheme] = useState(() => readInitialTheme());
  const [textSize, setTextSize] = useState(() => readInitialTextSize());
  const [layoutWidthPreference, setLayoutWidthPreference] = useState(() => readInitialLayoutWidthPreference());
  const [textMenuOpen, setTextMenuOpen] = useState(false);
  const textMenuRef = useRef(null);
  const recommendedLayoutWidth = useMemo(
    () => resolveRecommendedLayoutWidth(window.innerWidth),
    [],
  );
  const layoutWidthMode = useMemo(() => {
    if (layoutWidthPreference === 'recommended') {
      return recommendedLayoutWidth;
    }

    return layoutWidthPreference;
  }, [layoutWidthPreference, recommendedLayoutWidth]);

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
    try {
      window.localStorage.setItem(LAYOUT_WIDTH_STORAGE_KEY, layoutWidthPreference);
    } catch {
      // Ignore storage errors and keep the in-memory preference.
    }
  }, [layoutWidthPreference]);

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

  return (
    <div className="reader-shell">
      <main className="content-shell">
        <div className="reader-toolbar">
          <div className="reader-toolbar-actions">
            <div ref={textMenuRef} className="toolbar-menu">
              <button
                type="button"
                className="toolbar-button"
                onClick={() => setTextMenuOpen((current) => !current)}
                aria-expanded={textMenuOpen}
                aria-haspopup="dialog"
                aria-label="Display settings"
                title="Display settings"
              >
                Aa
              </button>
              {textMenuOpen ? (
                <div className="toolbar-popover display-settings-popover" role="dialog" aria-label="Display settings">
                  <section className="display-settings-section" aria-labelledby="display-settings-text">
                    <div id="display-settings-text" className="toolbar-popover-title">Text</div>
                    <div className="text-size-options">
                      {TEXT_SIZE_OPTIONS.map((option) => {
                        const checked = textSize === option;
                        const label = option.charAt(0).toUpperCase() + option.slice(1);

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`text-size-option${checked ? ' is-selected' : ''}`}
                            onClick={() => setTextSize(option)}
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
                  </section>
                  <section className="display-settings-section" aria-labelledby="display-settings-layout-width">
                    <div id="display-settings-layout-width" className="toolbar-popover-title">Layout Width</div>
                    <div className="text-size-options">
                      {LAYOUT_WIDTH_OPTIONS.map((option) => {
                        const checked = layoutWidthPreference === option;
                        const label = option.charAt(0).toUpperCase() + option.slice(1);

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`text-size-option${checked ? ' is-selected' : ''}`}
                            onClick={() => setLayoutWidthPreference(option)}
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
                    <button
                      type="button"
                      className={`display-settings-reset${layoutWidthPreference === 'recommended' ? ' is-selected' : ''}`}
                      onClick={() => setLayoutWidthPreference('recommended')}
                    >
                      Use recommended
                    </button>
                    <div className="display-settings-caption">
                      {layoutWidthPreference === 'recommended'
                        ? `Recommended for this screen: ${layoutWidthMode.charAt(0).toUpperCase()}${layoutWidthMode.slice(1)}`
                        : `Current recommendation for this screen: ${recommendedLayoutWidth.charAt(0).toUpperCase()}${recommendedLayoutWidth.slice(1)}`}
                    </div>
                  </section>
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
            <React.Fragment key={document.slug}>
              <Route
                path={`/${document.slug}`}
                element={<Navigate to={`/${document.slug}/${document.firstChapterId}`} replace />}
              />
              <Route
                path={`/${document.slug}/:chapterId`}
                element={<ChapterPage readerDocumentMeta={document} layoutWidthMode={layoutWidthMode} />}
              />
            </React.Fragment>
          ))}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AppShell />
    </BrowserRouter>
  );
}
