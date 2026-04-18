import { debugLog, getCurrentReaderDebugConfig } from './debug.js';

const IS_DEV = import.meta.env.DEV;

const MERMAID_RENDER_MODE_INLINE = 'inline';
const MERMAID_RENDER_MODE_MODAL = 'modal';
const MERMAID_EXPORT_PADDING = 24;
const MERMAID_EXPORT_MIN_SCALE = 2;
const MERMAID_EXPORT_MAX_SCALE = 3;
const MERMAID_DEFAULT_FILE_STEM = 'mermaid-diagram';
const MERMAID_DEFAULT_ZOOM_PERCENT = 100;
const MERMAID_MIN_ZOOM_PERCENT = 50;
const MERMAID_MAX_ZOOM_PERCENT = 200;

let mermaidModulePromise = null;
let mermaidRenderHighPriorityQueue = [];
let mermaidRenderNormalQueue = [];
let mermaidRenderActiveCount = 0;
const MERMAID_MAX_CONCURRENCY = 4;

function logMermaidMetric(name, payload = {}) {
  debugLog(getCurrentReaderDebugConfig(), 'mermaid', name, payload);
}

function clampMermaidZoom(zoomPercent) {
  return Math.min(MERMAID_MAX_ZOOM_PERCENT, Math.max(MERMAID_MIN_ZOOM_PERCENT, Number(zoomPercent) || MERMAID_DEFAULT_ZOOM_PERCENT));
}

function readThemeToken(styles, name, fallback = '') {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function getSvgIntrinsicDimensions(svgElement) {
  if (!(svgElement instanceof SVGElement)) {
    return { width: 0, height: 0 };
  }

  const viewBox = svgElement.getAttribute('viewBox') ?? '';
  const parts = viewBox.trim().split(/\s+/);
  if (parts.length === 4) {
    const width = Number(parts[2]);
    const height = Number(parts[3]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return { width, height };
    }
  }

  const width = Number(svgElement.getAttribute('width'));
  const height = Number(svgElement.getAttribute('height'));
  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
}

function stabilizeRenderedSvg(svgElement) {
  if (!(svgElement instanceof SVGElement)) {
    return;
  }

  const { width, height } = getSvgIntrinsicDimensions(svgElement);
  if (!width || !height) {
    return;
  }

  svgElement.setAttribute('width', String(width));
  svgElement.setAttribute('height', String(height));
  svgElement.style.width = `${width}px`;
  svgElement.style.maxWidth = 'none';
  svgElement.style.height = 'auto';
}

export function setRenderedMermaidZoom(container, zoomPercent = 100) {
  if (!(container instanceof HTMLElement)) {
    return 100;
  }

  const svgElement = container.querySelector('svg');
  if (!(svgElement instanceof SVGElement)) {
    return 100;
  }

  const { width } = getSvgIntrinsicDimensions(svgElement);
  if (!width) {
    return 100;
  }

  const clampedZoom = clampMermaidZoom(zoomPercent);
  svgElement.style.width = `${width * (clampedZoom / 100)}px`;
  svgElement.style.maxWidth = 'none';
  svgElement.style.height = 'auto';
  container.dataset.mermaidZoom = String(clampedZoom);
  return clampedZoom;
}

function applySequenceNumberTheme(svgElement) {
  if (!(svgElement instanceof SVGElement)) {
    return;
  }

  const styles = getComputedStyle(document.documentElement);
  const numberColor = readThemeToken(styles, '--mermaid-sequence-number-color');
  const numberBackground = readThemeToken(styles, '--mermaid-sequence-number-bg-color');
  const numberBorder = readThemeToken(styles, '--mermaid-sequence-number-border-color', numberBackground);

  svgElement.querySelectorAll('.sequenceNumber').forEach((node) => {
    node.setAttribute('fill', numberColor);
    node.style.fill = numberColor;
    node.style.fontWeight = '700';
  });

  svgElement.querySelectorAll("marker[id$='sequencenumber'] circle").forEach((node) => {
    node.setAttribute('fill', numberBackground);
    node.setAttribute('stroke', numberBorder);
    node.setAttribute('stroke-width', '1.5');
    node.style.fill = numberBackground;
    node.style.stroke = numberBorder;
    node.style.strokeWidth = '1.5px';
  });
}

function getMermaidHeadingContext(container, fallbackIndex = 0) {
  const root = container.closest('.chapter-article, .doc-article, article') ?? document.body;
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let precedingHeading = null;

  headings.forEach((heading) => {
    const position = heading.compareDocumentPosition(container);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      precedingHeading = heading;
    }
  });

  const title = precedingHeading?.textContent?.trim() || `Mermaid diagram ${fallbackIndex + 1}`;
  const headingId = precedingHeading?.id?.trim() ?? '';
  return { title, headingId };
}

function slugifyLabel(value) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || MERMAID_DEFAULT_FILE_STEM;
}

function assignMermaidMetadata(container, fallbackIndex = 0) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const { title, headingId } = getMermaidHeadingContext(container, fallbackIndex);
  const fileStem = headingId
    ? slugifyLabel(headingId)
    : `${MERMAID_DEFAULT_FILE_STEM}-${fallbackIndex + 1}`;

  container.dataset.mermaidTitle = title;
  container.dataset.mermaidHeadingId = headingId;
  container.dataset.mermaidIndex = String(fallbackIndex + 1);
  container.dataset.mermaidFileStem = fileStem;
  container.dataset.mermaidDiagramId = headingId
    ? `${slugifyLabel(headingId)}-${fallbackIndex + 1}`
    : `${fileStem}-${fallbackIndex + 1}`;
}

function ensureMermaidHeader(container) {
  let header = container.querySelector('.mermaid-header');
  if (header instanceof HTMLElement) {
    return header;
  }

  header = document.createElement('div');
  header.className = 'mermaid-header';

  const status = document.createElement('div');
  status.className = 'mermaid-header-status';

  const actions = document.createElement('div');
  actions.className = 'mermaid-actions';

  const zoomControls = document.createElement('div');
  zoomControls.className = 'mermaid-zoom-controls';
  zoomControls.setAttribute('role', 'group');
  zoomControls.setAttribute('aria-label', `Diagram zoom controls: ${container.dataset.mermaidTitle || 'Mermaid diagram'}`);

  const zoomOutButton = document.createElement('button');
  zoomOutButton.type = 'button';
  zoomOutButton.className = 'mermaid-action-button mermaid-zoom-button';
  zoomOutButton.dataset.mermaidAction = 'zoom-out';
  zoomOutButton.textContent = '−';
  zoomOutButton.setAttribute('aria-label', `Zoom out diagram: ${container.dataset.mermaidTitle || 'Mermaid diagram'}`);

  const zoomDisplay = document.createElement('span');
  zoomDisplay.className = 'mermaid-zoom-display';
  zoomDisplay.textContent = `${MERMAID_DEFAULT_ZOOM_PERCENT}%`;
  zoomDisplay.setAttribute('aria-live', 'polite');

  const zoomInButton = document.createElement('button');
  zoomInButton.type = 'button';
  zoomInButton.className = 'mermaid-action-button mermaid-zoom-button';
  zoomInButton.dataset.mermaidAction = 'zoom-in';
  zoomInButton.textContent = '+';
  zoomInButton.setAttribute('aria-label', `Zoom in diagram: ${container.dataset.mermaidTitle || 'Mermaid diagram'}`);

  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.className = 'mermaid-action-button mermaid-expand-button';
  expandButton.dataset.mermaidAction = 'expand';
  expandButton.textContent = 'Expand';
  expandButton.setAttribute('aria-label', `Expand diagram: ${container.dataset.mermaidTitle || 'Mermaid diagram'}`);

  zoomControls.append(zoomOutButton, zoomDisplay, zoomInButton);
  actions.append(zoomControls, expandButton);
  header.append(status, actions);
  return header;
}

function syncInlineMermaidZoomControls(container, zoomPercent) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const clampedZoom = clampMermaidZoom(zoomPercent);
  const zoomOutButton = container.querySelector('button[data-mermaid-action="zoom-out"]');
  const zoomInButton = container.querySelector('button[data-mermaid-action="zoom-in"]');
  const zoomDisplay = container.querySelector('.mermaid-zoom-display');

  if (zoomDisplay instanceof HTMLElement) {
    zoomDisplay.textContent = `${clampedZoom}%`;
  }

  if (zoomOutButton instanceof HTMLButtonElement) {
    zoomOutButton.disabled = clampedZoom <= MERMAID_MIN_ZOOM_PERCENT;
  }

  if (zoomInButton instanceof HTMLButtonElement) {
    zoomInButton.disabled = clampedZoom >= MERMAID_MAX_ZOOM_PERCENT;
  }
}

export function setInlineMermaidZoom(container, zoomPercent = MERMAID_DEFAULT_ZOOM_PERCENT) {
  if (!(container instanceof HTMLElement)) {
    return MERMAID_DEFAULT_ZOOM_PERCENT;
  }

  const appliedZoom = setRenderedMermaidZoom(container, zoomPercent);
  syncInlineMermaidZoomControls(container, appliedZoom);
  return appliedZoom;
}

function ensureMermaidScrollHint(container) {
  const header = ensureMermaidHeader(container);
  const status = header.querySelector('.mermaid-header-status');
  if (!(status instanceof HTMLElement)) {
    return null;
  }

  let hint = status.querySelector('.mermaid-scroll-hint');
  if (hint instanceof HTMLElement) {
    return hint;
  }

  hint = document.createElement('div');
  hint.className = 'mermaid-scroll-hint';
  hint.textContent = 'Scroll to view full diagram';
  hint.setAttribute('aria-hidden', 'true');
  status.append(hint);
  return hint;
}

function clearMermaidOverflowState(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  delete container.dataset.mermaidOverflowing;
  delete container.dataset.mermaidOverflowLeft;
  delete container.dataset.mermaidOverflowRight;
  delete container.dataset.mermaidScrolled;
  delete container.dataset.mermaidPannable;
  delete container.dataset.mermaidDragging;
}

function cleanupMermaidOverflowAffordances(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  if (typeof container.__mermaidOverflowCleanup === 'function') {
    container.__mermaidOverflowCleanup();
  }

  delete container.__mermaidOverflowCleanup;
  clearMermaidOverflowState(container);
  container.querySelector('.mermaid-scroll-hint')?.remove();
}

function syncMermaidOverflowState(container, scrollShell) {
  if (!(container instanceof HTMLElement) || !(scrollShell instanceof HTMLElement)) {
    return;
  }

  const hint = container.querySelector('.mermaid-scroll-hint');
  const maxScrollLeft = Math.max(0, scrollShell.scrollWidth - scrollShell.clientWidth);
  const maxScrollTop = Math.max(0, scrollShell.scrollHeight - scrollShell.clientHeight);
  const isOverflowing = maxScrollLeft > 8;
  const isPannable = maxScrollLeft > 8 || maxScrollTop > 8;
  const hasScrolled = scrollShell.scrollLeft > 4;
  const shouldShowHint = isOverflowing && scrollShell.scrollLeft < maxScrollLeft - 4;

  container.dataset.mermaidOverflowing = isOverflowing ? 'true' : 'false';
  container.dataset.mermaidScrolled = hasScrolled ? 'true' : 'false';
  container.dataset.mermaidPannable = isPannable ? 'true' : 'false';
  scrollShell.dataset.mermaidPannable = isPannable ? 'true' : 'false';

  if (hint instanceof HTMLElement) {
    hint.style.opacity = shouldShowHint ? '1' : '0';
    hint.style.transform = shouldShowHint ? 'translateY(0)' : 'translateY(-2px)';
  }

  if (!isOverflowing) {
    container.dataset.mermaidOverflowLeft = 'false';
    container.dataset.mermaidOverflowRight = 'false';
    scrollShell.removeAttribute('tabindex');
    scrollShell.setAttribute('aria-label', 'Mermaid diagram');
    return;
  }

  container.dataset.mermaidOverflowLeft = hasScrolled ? 'true' : 'false';
  container.dataset.mermaidOverflowRight = scrollShell.scrollLeft < maxScrollLeft - 4 ? 'true' : 'false';
  scrollShell.setAttribute('tabindex', '0');
  scrollShell.setAttribute('aria-label', 'Mermaid diagram. Scroll horizontally to view the full diagram.');
}

function installMermaidOverflowAffordances(container, { showHint = true } = {}) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  cleanupMermaidOverflowAffordances(container);

  const scrollShell = container.querySelector('.mermaid-scroll-shell');
  if (!(scrollShell instanceof HTMLElement)) {
    return;
  }

  if (showHint) {
    ensureMermaidScrollHint(container);
  }

  const sync = () => {
    syncMermaidOverflowState(container, scrollShell);
  };

  const handleScroll = () => {
    sync();
  };

  const dragState = {
    active: false,
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  };

  const clearDraggingState = () => {
    dragState.active = false;
    dragState.dragging = false;
    dragState.pointerId = null;
    delete container.dataset.mermaidDragging;
    delete scrollShell.dataset.mermaidDragging;
  };

  const startDrag = ({ clientX, clientY, pointerId = null } = {}) => {
    dragState.active = true;
    dragState.dragging = false;
    dragState.pointerId = pointerId;
    dragState.startX = clientX;
    dragState.startY = clientY;
    dragState.startScrollLeft = scrollShell.scrollLeft;
    dragState.startScrollTop = scrollShell.scrollTop;
  };

  const updateDrag = ({ clientX, clientY } = {}) => {
    if (!dragState.active) {
      return false;
    }

    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;

    if (!dragState.dragging && Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) {
      return false;
    }

    dragState.dragging = true;
    container.dataset.mermaidDragging = 'true';
    scrollShell.dataset.mermaidDragging = 'true';
    scrollShell.scrollLeft = dragState.startScrollLeft - deltaX;
    scrollShell.scrollTop = dragState.startScrollTop - deltaY;
    return true;
  };

  const handlePointerDown = (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    if (event.pointerType === 'touch' || event.button !== 0 || scrollShell.dataset.mermaidPannable !== 'true') {
      return;
    }

    startDrag({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    });

    scrollShell.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (updateDrag({ clientX: event.clientX, clientY: event.clientY })) {
      event.preventDefault();
    }
  };

  const handlePointerEnd = (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    if (scrollShell.hasPointerCapture(event.pointerId)) {
      scrollShell.releasePointerCapture(event.pointerId);
    }

    clearDraggingState();
  };

  const handleMouseDown = (event) => {
    if (!(event instanceof MouseEvent)) {
      return;
    }

    if (dragState.active || event.button !== 0 || scrollShell.dataset.mermaidPannable !== 'true') {
      return;
    }

    startDrag({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: null,
    });
    event.preventDefault();
  };

  const handleMouseMove = (event) => {
    if (!(event instanceof MouseEvent) || !dragState.active || dragState.pointerId != null) {
      return;
    }

    if (updateDrag({ clientX: event.clientX, clientY: event.clientY })) {
      event.preventDefault();
    }
  };

  const handleMouseUp = () => {
    if (!dragState.active || dragState.pointerId != null) {
      return;
    }

    clearDraggingState();
  };

  scrollShell.addEventListener('scroll', handleScroll, { passive: true });
  scrollShell.addEventListener('pointerdown', handlePointerDown);
  scrollShell.addEventListener('pointermove', handlePointerMove);
  scrollShell.addEventListener('pointerup', handlePointerEnd);
  scrollShell.addEventListener('pointercancel', handlePointerEnd);
  scrollShell.addEventListener('lostpointercapture', handlePointerEnd);
  scrollShell.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      sync();
    });
    resizeObserver.observe(scrollShell);
    const viewport = scrollShell.querySelector('.mermaid-viewport');
    if (viewport instanceof HTMLElement) {
      resizeObserver.observe(viewport);
    }
    const svg = scrollShell.querySelector('svg');
    if (svg instanceof SVGElement) {
      resizeObserver.observe(svg);
    }
  }

  const rafId = requestAnimationFrame(sync);

  container.__mermaidOverflowCleanup = () => {
    cancelAnimationFrame(rafId);
    scrollShell.removeEventListener('scroll', handleScroll);
    scrollShell.removeEventListener('pointerdown', handlePointerDown);
    scrollShell.removeEventListener('pointermove', handlePointerMove);
    scrollShell.removeEventListener('pointerup', handlePointerEnd);
    scrollShell.removeEventListener('pointercancel', handlePointerEnd);
    scrollShell.removeEventListener('lostpointercapture', handlePointerEnd);
    scrollShell.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    resizeObserver?.disconnect();
    clearDraggingState();
  };
}

function getMermaidConfig() {
  const styles = getComputedStyle(document.documentElement);

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
    themeVariables: {
      background: readThemeToken(styles, '--mermaid-background', 'transparent'),
      primaryColor: readThemeToken(styles, '--mermaid-primary-color'),
      primaryTextColor: readThemeToken(styles, '--mermaid-primary-text-color'),
      primaryBorderColor: readThemeToken(styles, '--mermaid-primary-border-color'),
      lineColor: readThemeToken(styles, '--mermaid-line-color'),
      secondaryColor: readThemeToken(styles, '--mermaid-secondary-color'),
      tertiaryColor: readThemeToken(styles, '--mermaid-tertiary-color'),
      mainBkg: readThemeToken(styles, '--mermaid-main-bg'),
      secondBkg: readThemeToken(styles, '--mermaid-second-bg'),
      tertiaryBkg: readThemeToken(styles, '--mermaid-tertiary-bg'),
      nodeBorder: readThemeToken(styles, '--mermaid-node-border'),
      clusterBkg: readThemeToken(styles, '--mermaid-cluster-bg'),
      clusterBorder: readThemeToken(styles, '--mermaid-cluster-border'),
      titleColor: readThemeToken(styles, '--mermaid-title-color'),
      textColor: readThemeToken(styles, '--mermaid-text-color'),
      edgeLabelBackground: readThemeToken(styles, '--mermaid-edge-label-background'),
      actorBkg: readThemeToken(styles, '--mermaid-actor-bg'),
      actorBorder: readThemeToken(styles, '--mermaid-actor-border'),
      actorTextColor: readThemeToken(styles, '--mermaid-actor-text-color'),
      actorLineColor: readThemeToken(styles, '--mermaid-actor-line-color'),
      signalColor: readThemeToken(styles, '--mermaid-signal-color'),
      signalTextColor: readThemeToken(styles, '--mermaid-signal-text-color'),
      labelBoxBkgColor: readThemeToken(styles, '--mermaid-label-box-bg-color'),
      labelBoxBorderColor: readThemeToken(styles, '--mermaid-label-box-border-color'),
      labelTextColor: readThemeToken(styles, '--mermaid-label-text-color'),
      loopTextColor: readThemeToken(styles, '--mermaid-loop-text-color'),
      noteBkgColor: readThemeToken(styles, '--mermaid-note-bg-color'),
      noteBorderColor: readThemeToken(styles, '--mermaid-note-border-color'),
      noteTextColor: readThemeToken(styles, '--mermaid-note-text-color'),
      activationBorderColor: readThemeToken(styles, '--mermaid-activation-border-color'),
      activationBkgColor: readThemeToken(styles, '--mermaid-activation-bg-color'),
      sequenceNumberColor: readThemeToken(styles, '--mermaid-sequence-number-color'),
    },
  };
}

function decodeHtmlEntities(value) {
  if (!value || !value.includes('&')) {
    return value;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

async function getMermaidInstance() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((module) => module.default);
  }

  const mermaid = await mermaidModulePromise;
  mermaid.initialize(getMermaidConfig());
  return mermaid;
}

function buildRenderedMermaidShell(svgMarkup) {
  const viewport = document.createElement('div');
  viewport.className = 'mermaid-viewport';
  viewport.innerHTML = svgMarkup;

  const scrollShell = document.createElement('div');
  scrollShell.className = 'mermaid-scroll-shell';
  scrollShell.append(viewport);

  const renderedSvg = viewport.querySelector('svg');
  stabilizeRenderedSvg(renderedSvg);
  applySequenceNumberTheme(renderedSvg);

  return { viewport, scrollShell, renderedSvg };
}

async function renderMermaidTarget(target, source, {
  mermaid,
  sectionId = null,
  theme = null,
  mode = MERMAID_RENDER_MODE_INLINE,
  zoomPercent = MERMAID_DEFAULT_ZOOM_PERCENT,
} = {}) {
  if (!(target instanceof HTMLElement)) {
    throw new Error('Mermaid target must be an HTML element');
  }

  const renderId = `mermaid-render-${Math.random().toString(36).slice(2, 10)}`;
  const { svg } = await mermaid.render(renderId, source);
  cleanupMermaidOverflowAffordances(target);

  const { scrollShell, renderedSvg, viewport } = buildRenderedMermaidShell(svg);
  if (!(renderedSvg instanceof SVGElement)) {
    throw new Error('Mermaid render completed without SVG output');
  }

  if (theme) {
    target.dataset.mermaidTheme = theme;
  } else {
    delete target.dataset.mermaidTheme;
  }

  if (mode === MERMAID_RENDER_MODE_INLINE) {
    const header = ensureMermaidHeader(target);
    target.replaceChildren(header, scrollShell);
    setInlineMermaidZoom(target, zoomPercent);
    installMermaidOverflowAffordances(target, { showHint: true });
  } else {
    target.replaceChildren(scrollShell);
    setRenderedMermaidZoom(target, zoomPercent);
    installMermaidOverflowAffordances(target, { showHint: false });
  }

  logMermaidMetric('rendered', { renderId, sectionId, renderedSvgCount: viewport.querySelectorAll('svg').length, mode });
  return { renderedSvg, scrollShell };
}

export async function renderMermaidDiagram(target, {
  source,
  sectionId = null,
  priority = 'normal',
  theme = null,
  mode = MERMAID_RENDER_MODE_MODAL,
  zoomPercent = MERMAID_DEFAULT_ZOOM_PERCENT,
} = {}) {
  const normalizedSource = decodeHtmlEntities(source
    ?.replace(/\u00a0/g, ' ')
    ?.replace(/&nbsp;/g, ' ')
    ?.trim() ?? '');

  if (!(target instanceof HTMLElement) || !normalizedSource) {
    return null;
  }

  return enqueueMermaidRenderTask(async () => {
    const mermaid = await getMermaidInstance();
    try {
      return await renderMermaidTarget(target, normalizedSource, {
        mermaid,
        sectionId,
        theme,
        mode,
        zoomPercent,
      });
    } catch (error) {
      cleanupMermaidOverflowAffordances(target);
      target.textContent = normalizedSource;
      throw error;
    }
  }, priority);
}

function serializeMermaidSvg(svgElement) {
  const clone = svgElement.cloneNode(true);
  const { width, height } = getSvgIntrinsicDimensions(svgElement);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  if (width) {
    clone.setAttribute('width', String(width));
    clone.style.width = `${width}px`;
  }
  if (height) {
    clone.setAttribute('height', String(height));
    clone.style.height = `${height}px`;
  }
  clone.style.maxWidth = 'none';

  return new XMLSerializer().serializeToString(clone);
}

function getMermaidExportScale() {
  const deviceScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  return Math.min(MERMAID_EXPORT_MAX_SCALE, Math.max(deviceScale, MERMAID_EXPORT_MIN_SCALE));
}

function loadSvgImage(svgMarkup) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load serialized Mermaid SVG'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error(`Failed to encode Mermaid canvas as ${type}`));
    }, type);
  });
}

export async function rasterizeMermaidSvgToPng(svgElement, {
  backgroundColor = null,
  padding = MERMAID_EXPORT_PADDING,
  scale = null,
} = {}) {
  if (!(svgElement instanceof SVGElement)) {
    throw new Error('Cannot export Mermaid PNG without a rendered SVG');
  }

  const { width, height } = getSvgIntrinsicDimensions(svgElement);
  if (!width || !height) {
    throw new Error('Mermaid SVG is missing intrinsic dimensions');
  }

  const styles = getComputedStyle(document.documentElement);
  const fill = backgroundColor ?? readThemeToken(styles, '--mermaid-card-bg', '#ffffff');
  const exportScale = Number.isFinite(scale) ? scale : getMermaidExportScale();
  const totalWidth = width + (padding * 2);
  const totalHeight = height + (padding * 2);
  const svgMarkup = serializeMermaidSvg(svgElement);
  const image = await loadSvgImage(svgMarkup);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(totalWidth * exportScale);
  canvas.height = Math.ceil(totalHeight * exportScale);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create canvas context for Mermaid PNG export');
  }

  context.scale(exportScale, exportScale);
  context.fillStyle = fill;
  context.fillRect(0, 0, totalWidth, totalHeight);
  context.drawImage(image, padding, padding, width, height);

  return canvasToBlob(canvas, 'image/png');
}

export function canCopyMermaidPngToClipboard() {
  return Boolean(
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    navigator?.clipboard?.write &&
    typeof ClipboardItem !== 'undefined',
  );
}

export async function copyMermaidSourceToClipboard(source) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error('Clipboard text write is not available in this browser');
  }

  await navigator.clipboard.writeText(source);
}

export async function copyMermaidPngToClipboard(svgElement) {
  if (!canCopyMermaidPngToClipboard()) {
    throw new Error('PNG clipboard write is not supported in this browser');
  }

  const blob = await rasterizeMermaidSvgToPng(svgElement);
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
  return blob;
}

export function getMermaidPngFileName({ fileStem = MERMAID_DEFAULT_FILE_STEM, theme = 'dark' } = {}) {
  return `${slugifyLabel(fileStem)}-${slugifyLabel(theme || 'dark')}.png`;
}

export async function downloadMermaidPng(svgElement, fileName) {
  const blob = await rasterizeMermaidSvgToPng(svgElement);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
  return blob;
}

export async function renderMermaid(root, {
  onDebugEvent = null,
  sectionId = null,
  priority = 'normal',
  theme = null,
  getZoomPercent = null,
} = {}) {
  const mermaidCodeBlocks = root.querySelectorAll('pre > code.language-mermaid');
  const existingMermaidNodes = root.querySelectorAll('.mermaid[data-mermaid-source]');

  if (!mermaidCodeBlocks.length && !existingMermaidNodes.length) {
    return;
  }

  const mermaid = await getMermaidInstance();
  const nodes = [];

  mermaidCodeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'mermaid';
    const source = decodeHtmlEntities(code.textContent
      ?.replace(/\u00a0/g, ' ')
      ?.replace(/&nbsp;/g, ' ')
      ?.trim() ?? '');
    container.dataset.mermaidSource = source;
    pre.replaceWith(container);
    nodes.push(container);
  });

  existingMermaidNodes.forEach((node) => {
    const source = node.dataset.mermaidSource;
    if (!source) {
      return;
    }

    cleanupMermaidOverflowAffordances(node);
    node.removeAttribute('data-processed');
    nodes.push(node);
  });

  if (!nodes.length) {
    return;
  }

  nodes.forEach((node, index) => {
    assignMermaidMetadata(node, index);
    if (theme) {
      node.dataset.mermaidTheme = theme;
    } else {
      delete node.dataset.mermaidTheme;
    }
  });

  await enqueueMermaidRenderTask(async () => {
    for (const node of nodes) {
      const source = decodeHtmlEntities(node.dataset.mermaidSource ?? '');
      if (!source) {
        continue;
      }

      try {
        await renderMermaidTarget(node, source, {
          mermaid,
          sectionId,
          theme,
          mode: MERMAID_RENDER_MODE_INLINE,
          zoomPercent: getZoomPercent?.(node) ?? MERMAID_DEFAULT_ZOOM_PERCENT,
        });
        onDebugEvent?.('mermaid', 'section_rendered', {
          sectionId,
          renderedSvgCount: node.querySelectorAll('svg').length,
          fallback: false,
          failed: false,
        });
      } catch (error) {
        cleanupMermaidOverflowAffordances(node);
        node.textContent = source;
        logMermaidMetric('failed', { error: String(error), sectionId });
        onDebugEvent?.('mermaid', 'render_failed', {
          sectionId,
          error: String(error),
          fallback: true,
          failed: true,
        });
        console.error('Mermaid render failed', error);
      }
    }
  }, priority);
}

function drainMermaidRenderQueue() {
  while (mermaidRenderActiveCount < MERMAID_MAX_CONCURRENCY) {
    const nextTask = mermaidRenderHighPriorityQueue.shift() ?? mermaidRenderNormalQueue.shift() ?? null;
    if (!nextTask) {
      return;
    }

    mermaidRenderActiveCount += 1;
    Promise.resolve()
      .then(nextTask.task)
      .then(nextTask.resolve, nextTask.reject)
      .finally(() => {
        mermaidRenderActiveCount = Math.max(0, mermaidRenderActiveCount - 1);
        drainMermaidRenderQueue();
      });
  }
}

function enqueueMermaidRenderTask(task, priority = 'normal') {
  return new Promise((resolve, reject) => {
    const entry = { task, resolve, reject };
    if (priority === 'target') {
      mermaidRenderHighPriorityQueue.push(entry);
    } else {
      mermaidRenderNormalQueue.push(entry);
    }

    drainMermaidRenderQueue();
  });
}

export function assertMermaidSectionRendered(sectionId, root) {
  if (!IS_DEV) {
    return;
  }

  const mermaidNodes = Array.from(root.querySelectorAll('.mermaid'));
  if (!mermaidNodes.length) {
    console.error(`[reader] Mermaid section ${sectionId} mounted without Mermaid containers`);
    return;
  }

  const hasSvg = mermaidNodes.some((node) => node.querySelector('svg'));
  const hasFallbackText = mermaidNodes.some((node) => (node.textContent ?? '').trim().length > 0);

  if (!hasSvg && !hasFallbackText) {
    console.error(`[reader] Mermaid section ${sectionId} mounted without SVG or fallback text`);
  }
}
