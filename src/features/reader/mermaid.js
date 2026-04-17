import { debugLog, getCurrentReaderDebugConfig } from './debug.js';

const IS_DEV = import.meta.env.DEV;

let mermaidModulePromise = null;
let mermaidRenderHighPriorityQueue = [];
let mermaidRenderNormalQueue = [];
let mermaidRenderActiveCount = 0;
const MERMAID_MAX_CONCURRENCY = 4;

function logMermaidMetric(name, payload = {}) {
  debugLog(getCurrentReaderDebugConfig(), 'mermaid', name, payload);
}

function readThemeToken(styles, name, fallback = '') {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function stabilizeRenderedSvg(svgElement) {
  if (!(svgElement instanceof SVGElement)) {
    return;
  }

  const viewBox = svgElement.getAttribute('viewBox') ?? '';
  const parts = viewBox.trim().split(/\s+/);
  if (parts.length !== 4) {
    return;
  }

  const intrinsicWidth = Number(parts[2]);
  const intrinsicHeight = Number(parts[3]);
  if (!Number.isFinite(intrinsicWidth) || !Number.isFinite(intrinsicHeight)) {
    return;
  }

  svgElement.setAttribute('width', String(intrinsicWidth));
  svgElement.setAttribute('height', String(intrinsicHeight));
  svgElement.style.width = `${intrinsicWidth}px`;
  svgElement.style.maxWidth = 'none';
  svgElement.style.height = 'auto';
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

function clearMermaidOverflowState(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  delete container.dataset.mermaidOverflowing;
  delete container.dataset.mermaidOverflowLeft;
  delete container.dataset.mermaidOverflowRight;
  delete container.dataset.mermaidScrolled;
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

function ensureMermaidScrollHint(container) {
  let hint = container.querySelector('.mermaid-scroll-hint');
  if (hint) {
    return hint;
  }

  hint = document.createElement('div');
  hint.className = 'mermaid-scroll-hint';
  hint.textContent = 'Scroll to view full diagram';
  hint.setAttribute('aria-hidden', 'true');
  container.prepend(hint);
  return hint;
}

function syncMermaidOverflowState(container, scrollShell) {
  if (!(container instanceof HTMLElement) || !(scrollShell instanceof HTMLElement)) {
    return;
  }

  const maxScrollLeft = Math.max(0, scrollShell.scrollWidth - scrollShell.clientWidth);
  const isOverflowing = maxScrollLeft > 8;
  const hasScrolled = scrollShell.scrollLeft > 4;

  container.dataset.mermaidOverflowing = isOverflowing ? 'true' : 'false';
  container.dataset.mermaidScrolled = hasScrolled ? 'true' : 'false';

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

function installMermaidOverflowAffordances(container) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  cleanupMermaidOverflowAffordances(container);

  const scrollShell = container.querySelector('.mermaid-scroll-shell');
  if (!(scrollShell instanceof HTMLElement)) {
    return;
  }

  ensureMermaidScrollHint(container);

  const sync = () => {
    syncMermaidOverflowState(container, scrollShell);
  };

  const handleScroll = () => {
    sync();
  };

  scrollShell.addEventListener('scroll', handleScroll, { passive: true });

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
    resizeObserver?.disconnect();
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

export async function renderMermaid(root, {
  onDebugEvent = null,
  sectionId = null,
  priority = 'normal',
  theme = null,
} = {}) {
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
    if (theme) {
      container.dataset.mermaidTheme = theme;
    }

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
    if (theme) {
      node.dataset.mermaidTheme = theme;
    }
    node.innerHTML = '';
    nodes.push(node);
  });

  if (!nodes.length) {
    return;
  }

  await enqueueMermaidRenderTask(async () => {
    for (const node of nodes) {
      const source = decodeHtmlEntities(node.dataset.mermaidSource ?? '');
      if (!source) {
        continue;
      }

      try {
        const renderId = `mermaid-render-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(renderId, source);
        cleanupMermaidOverflowAffordances(node);
        const viewport = document.createElement('div');
        viewport.className = 'mermaid-viewport';
        viewport.innerHTML = svg;
        const scrollShell = document.createElement('div');
        scrollShell.className = 'mermaid-scroll-shell';
        scrollShell.append(viewport);
        const renderedSvg = viewport.querySelector('svg');
        stabilizeRenderedSvg(renderedSvg);
        applySequenceNumberTheme(renderedSvg);
        node.replaceChildren(scrollShell);
        installMermaidOverflowAffordances(node);
        const renderedSvgCount = viewport.querySelectorAll('svg').length;
        if (!renderedSvgCount) {
          throw new Error('Mermaid render completed without SVG output');
        }
        logMermaidMetric('rendered', { renderId, sectionId, renderedSvgCount });
        onDebugEvent?.('mermaid', 'section_rendered', {
          sectionId,
          renderedSvgCount,
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
