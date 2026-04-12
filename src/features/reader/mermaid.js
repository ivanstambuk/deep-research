import { debugLog, getCurrentReaderDebugConfig } from './debug.js';

const IS_DEV = import.meta.env.DEV;

let mermaidModulePromise = null;
let mermaidRenderQueue = Promise.resolve();

function logMermaidMetric(name, payload = {}) {
  debugLog(getCurrentReaderDebugConfig(), 'mermaid', name, payload);
}

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

function decodeHtmlEntities(value) {
  if (!value || !value.includes('&')) {
    return value;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

export async function renderMermaid(root, { onDebugEvent = null, sectionId = null } = {}) {
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

    pre.replaceWith(container);
    nodes.push(container);
  });

  existingMermaidNodes.forEach((node) => {
    const source = node.dataset.mermaidSource;
    if (!source) {
      return;
    }

    node.removeAttribute('data-processed');
    node.innerHTML = '';
    nodes.push(node);
  });

  if (!nodes.length) {
    return;
  }

  mermaidRenderQueue = mermaidRenderQueue.catch(() => {}).then(async () => {
    for (const node of nodes) {
      const source = decodeHtmlEntities(node.dataset.mermaidSource ?? '');
      if (!source) {
        continue;
      }

      try {
        const renderId = `mermaid-render-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(renderId, source);
        node.innerHTML = svg;
        const renderedSvgCount = node.querySelectorAll('svg').length;
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
  });

  await mermaidRenderQueue;
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
