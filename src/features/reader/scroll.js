const ARTICLE_SCROLL_POSITION_STORAGE_PREFIX = 'dr-reader-scroll-position:v1';

export function scrollIntoViewWithOffset(element, offset = 0, behavior = 'auto') {
  const rect = element.getBoundingClientRect();
  const desiredTop = Math.max(0, window.scrollY + rect.top - offset);
  window.scrollTo({ top: desiredTop, behavior });
}

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getArticleScrollPositionStorageKey(documentSlug, chapterId) {
  if (!documentSlug || !chapterId) {
    return null;
  }

  return `${ARTICLE_SCROLL_POSITION_STORAGE_PREFIX}:${documentSlug}/${chapterId}`;
}

function normalizeStoredArticleScrollPosition(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const scrollY = Number(value.scrollY);
  const offsetFromHeading = Number(value.offsetFromHeading ?? 0);
  if (!Number.isFinite(scrollY) || scrollY < 0 || !Number.isFinite(offsetFromHeading)) {
    return null;
  }

  return {
    headingId: typeof value.headingId === 'string' ? value.headingId : '',
    offsetFromHeading,
    scrollY,
  };
}

function isHeadingVisible(element) {
  return element instanceof HTMLElement &&
    !element.closest('[hidden]') &&
    !element.closest('.tabbed-example-panel[hidden]');
}

function getArticleHeadingElements(articleNode, headingIds = []) {
  if (!(articleNode instanceof HTMLElement)) {
    return [];
  }

  const headings = headingIds.length
    ? headingIds.map((id) => document.getElementById(id))
    : Array.from(articleNode.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'));

  return headings.filter((heading) => (
    heading instanceof HTMLElement &&
    articleNode.contains(heading) &&
    isHeadingVisible(heading)
  ));
}

export function readArticleScrollPosition(documentSlug, chapterId) {
  const storage = getSessionStorage();
  const key = getArticleScrollPositionStorageKey(documentSlug, chapterId);
  if (!storage || !key) {
    return null;
  }

  try {
    return normalizeStoredArticleScrollPosition(JSON.parse(storage.getItem(key) || 'null'));
  } catch {
    return null;
  }
}

export function captureArticleScrollPosition({
  articleNode,
  headingIds = [],
  offset = 0,
}) {
  if (typeof window === 'undefined' || !(articleNode instanceof HTMLElement)) {
    return null;
  }

  const scrollY = Math.max(0, Math.round(window.scrollY));
  const viewportAnchorY = Number.isFinite(offset) ? offset : 0;
  let bestHeading = null;
  let bestHeadingTop = Number.NEGATIVE_INFINITY;

  getArticleHeadingElements(articleNode, headingIds).forEach((heading) => {
    const top = heading.getBoundingClientRect().top;
    if (top <= viewportAnchorY + 1 && top > bestHeadingTop) {
      bestHeading = heading;
      bestHeadingTop = top;
    }
  });

  return {
    headingId: bestHeading?.id || '',
    offsetFromHeading: bestHeading ? Math.round(viewportAnchorY - bestHeadingTop) : 0,
    scrollY,
  };
}

export function writeArticleScrollPosition({
  documentSlug,
  chapterId,
  articleNode,
  headingIds = [],
  offset = 0,
}) {
  const storage = getSessionStorage();
  const key = getArticleScrollPositionStorageKey(documentSlug, chapterId);
  const position = captureArticleScrollPosition({ articleNode, headingIds, offset });
  if (!storage || !key || !position) {
    return null;
  }

  try {
    storage.setItem(key, JSON.stringify(position));
  } catch {
    // Session storage can be unavailable in private browsing or quota-constrained contexts.
  }

  return position;
}

export function restoreArticleScrollPosition(position, offset = 0, behavior = 'auto') {
  const normalizedPosition = normalizeStoredArticleScrollPosition(position);
  if (typeof window === 'undefined' || !normalizedPosition) {
    return false;
  }

  let desiredTop = null;
  if (normalizedPosition.headingId) {
    const target = document.getElementById(normalizedPosition.headingId);
    if (isHeadingVisible(target)) {
      desiredTop = window.scrollY +
        target.getBoundingClientRect().top +
        normalizedPosition.offsetFromHeading -
        offset;
    }
  }

  if (!Number.isFinite(desiredTop)) {
    desiredTop = normalizedPosition.scrollY;
  }

  if (!Number.isFinite(desiredTop)) {
    return false;
  }

  window.scrollTo({
    top: Math.max(0, Math.round(desiredTop)),
    behavior,
  });
  return true;
}

export function createArticleScrollPositionPersistence({
  documentSlug,
  chapterId,
  articleNode,
  headingIds = [],
  offset = 0,
  shouldSuppress = () => false,
  onUserScroll = () => {},
}) {
  if (typeof window === 'undefined' || !(articleNode instanceof HTMLElement)) {
    return () => {};
  }

  let frame = null;
  let disposed = false;

  const savePosition = () => {
    if (disposed || shouldSuppress()) {
      return;
    }

    writeArticleScrollPosition({
      documentSlug,
      chapterId,
      articleNode,
      headingIds,
      offset,
    });
  };

  const flushSave = () => {
    if (frame != null) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
    savePosition();
  };

  const handleScroll = () => {
    if (disposed || shouldSuppress()) {
      return;
    }

    onUserScroll();
    if (frame != null) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = null;
      savePosition();
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('pagehide', flushSave);

  return () => {
    flushSave();
    disposed = true;
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('pagehide', flushSave);
  };
}
