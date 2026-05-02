const DEFAULT_LABELS = {
  warning: 'Warning',
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  remark: 'Remark',
  important: 'Important',
  caution: 'Caution',
};

const KNOWN_DIRECTIVES = new Set(Object.keys(DEFAULT_LABELS));
const FEATURE_DIRECTIVES = new Set(['tabbed-example', 'tab']);
const STORAGE_KEY_PATTERN = /^[a-z0-9:_-]+$/;
const TAB_KEY_PATTERN = /^[a-z0-9_-]+$/;
const ANCHOR_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const FENCE_START_PATTERN = /^(\s*)(`{3,}|~{3,})/;
const ATTRIBUTE_PATTERN = /([A-Za-z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^}\s]+))/g;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractLabelNode(directive) {
  const labelNode = directive.children?.find((child) => child.data?.directiveLabel === true);

  if (!labelNode) {
    return { labelChildren: [], hasCustomTitle: false };
  }

  directive.children = directive.children.filter((child) => child !== labelNode);
  return {
    labelChildren: labelNode.children || [],
    hasCustomTitle: (labelNode.children || []).length > 0,
  };
}

function directiveLocation(node, file) {
  const path = typeof file?.path === 'string' && file.path ? file.path : 'MDX source';
  const line = node?.position?.start?.line;
  const column = node?.position?.start?.column;

  return line ? `${path}:${line}${column ? `:${column}` : ''}` : path;
}

function directiveError(node, file, message) {
  return new Error(`${directiveLocation(node, file)}: ${message}`);
}

function extractPlainText(children = []) {
  let text = '';

  for (const child of children) {
    if (child.type === 'text' || child.type === 'inlineCode') {
      text += child.value ?? '';
      continue;
    }

    if (Array.isArray(child.children)) {
      text += extractPlainText(child.children);
    }
  }

  return text.trim();
}

function extractPlainLabel(directive, file, directiveName) {
  const { labelChildren, hasCustomTitle } = extractLabelNode(directive);

  if (!hasCustomTitle) {
    throw directiveError(directive, file, `${directiveName} requires a plain-text label`);
  }

  const label = extractPlainText(labelChildren);
  if (!label) {
    throw directiveError(directive, file, `${directiveName} label cannot be empty`);
  }

  return label;
}

function normalizeAttribute(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHeadingLevel(value, file, node) {
  if (value == null || value === '') {
    return 5;
  }

  const level = Number.parseInt(String(value), 10);
  if (!Number.isInteger(level) || level < 2 || level > 6) {
    throw directiveError(node, file, `tab level must be an integer from 2 to 6`);
  }

  return level;
}

function slugText(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'group';
}

function validatePersistKey(value, file, node) {
  const persist = normalizeAttribute(value);
  if (!persist) {
    return '';
  }

  if (!STORAGE_KEY_PATTERN.test(persist)) {
    throw directiveError(node, file, `tabbed-example persist must match ${STORAGE_KEY_PATTERN}`);
  }

  return persist;
}

function validateTabKey(value, file, node) {
  const key = normalizeAttribute(value);
  if (!key) {
    throw directiveError(node, file, 'tab requires a key attribute');
  }

  if (!TAB_KEY_PATTERN.test(key)) {
    throw directiveError(node, file, `tab key must match ${TAB_KEY_PATTERN}`);
  }

  return key;
}

function validateAnchor(value, file, node) {
  const anchor = normalizeAttribute(value);
  if (!anchor) {
    return '';
  }

  if (!ANCHOR_PATTERN.test(anchor)) {
    throw directiveError(node, file, `tab anchor must match ${ANCHOR_PATTERN}`);
  }

  return anchor;
}

function createHtmlNode(value) {
  return {
    type: 'html',
    value,
  };
}

function createTabbedExampleTitleNode(groupId, title) {
  return createHtmlNode(
    `<div class="tabbed-example-title" id="${escapeHtml(`${groupId}-title`)}">${escapeHtml(title)}</div>`,
  );
}

function createTablistNode(groupId, tabs) {
  const buttons = tabs.map((tab, index) => {
    const selected = index === 0;
    const subtitle = tab.subtitle
      ? `<span class="tabbed-example-tab-subtitle">${escapeHtml(tab.subtitle)}</span>`
      : '';

    return [
      `<button type="button" class="tabbed-example-tab${selected ? ' is-active' : ''}"`,
      ` id="${escapeHtml(tab.tabId)}"`,
      ' role="tab"',
      ` aria-selected="${selected ? 'true' : 'false'}"`,
      ` aria-controls="${escapeHtml(tab.panelId)}"`,
      ` tabindex="${selected ? '0' : '-1'}"`,
      ` data-tabbed-example-key="${escapeHtml(tab.key)}">`,
      `<span class="tabbed-example-tab-label">${escapeHtml(tab.label)}</span>`,
      subtitle,
      '</button>',
    ].join('');
  }).join('');

  return createHtmlNode(
    `<div class="tabbed-example-tablist" role="tablist" aria-labelledby="${escapeHtml(`${groupId}-title`)}">${buttons}</div>`,
  );
}

function prepareTabNode(tabNode, tab, index) {
  const selected = index === 0;
  tabNode.data = tabNode.data || {};
  tabNode.data.hName = 'section';
  tabNode.data.hProperties = {
    className: ['tabbed-example-panel', ...(selected ? ['is-active'] : [])],
    id: tab.panelId,
    role: 'tabpanel',
    'aria-labelledby': tab.tabId,
    'data-tabbed-example-panel': '',
    'data-tabbed-example-key': tab.key,
    ...(selected ? {} : { hidden: true }),
  };

  if (tab.heading) {
    tabNode.children.unshift(createHtmlNode(`<h${tab.level} id="${escapeHtml(tab.anchor)}">${escapeHtml(tab.heading)}</h${tab.level}>`));
  }
}

function transformTabbedExample(node, file, state) {
  const title = extractPlainLabel(node, file, 'tabbed-example');
  const persist = validatePersistKey(node.attributes?.persist, file, node);
  const groupId = `tabbed-example-${slugText(title)}-${state.tabbedExampleIndex}`;
  state.tabbedExampleIndex += 1;

  const tabNodes = node.children.filter((child) => child?.type === 'containerDirective' && child.name?.toLowerCase() === 'tab');
  if (tabNodes.length === 0 || tabNodes.length !== node.children.length) {
    throw directiveError(node, file, 'tabbed-example may contain only nested tab directives');
  }

  const keys = new Set();
  const anchors = new Set();
  const tabs = tabNodes.map((tabNode) => {
    const label = extractPlainLabel(tabNode, file, 'tab');
    const key = validateTabKey(tabNode.attributes?.key, file, tabNode);
    if (keys.has(key)) {
      throw directiveError(tabNode, file, `duplicate tab key: ${key}`);
    }
    keys.add(key);

    const subtitle = normalizeAttribute(tabNode.attributes?.subtitle);
    const heading = normalizeAttribute(tabNode.attributes?.heading);
    const anchor = validateAnchor(tabNode.attributes?.anchor, file, tabNode);
    const level = normalizeHeadingLevel(tabNode.attributes?.level, file, tabNode);

    if (heading && !anchor) {
      throw directiveError(tabNode, file, 'tab with heading requires an anchor attribute');
    }

    if (anchor) {
      if (anchors.has(anchor)) {
        throw directiveError(tabNode, file, `duplicate tab anchor: ${anchor}`);
      }
      anchors.add(anchor);
    }

    return {
      key,
      label,
      subtitle,
      heading,
      anchor,
      level,
      tabId: `${groupId}-tab-${key}`,
      panelId: `${groupId}-panel-${key}`,
      node: tabNode,
    };
  });

  tabs.forEach((tab, index) => {
    prepareTabNode(tab.node, tab, index);
  });

  node.data = node.data || {};
  node.data.hName = 'div';
  node.data.hProperties = {
    className: ['tabbed-example-group'],
    id: groupId,
    'data-tabbed-example': '',
    ...(persist ? { 'data-tabbed-example-persist': persist } : {}),
  };

  node.children = [
    createTabbedExampleTitleNode(groupId, title),
    createTablistNode(groupId, tabs),
    ...tabNodes,
  ];
}

function transformDirectiveNode(node, file, state) {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (node.type === 'textDirective') {
    const name = node.name?.toLowerCase();
    if (!name || KNOWN_DIRECTIVES.has(name)) {
      return;
    }

    if (FEATURE_DIRECTIVES.has(name)) {
      throw directiveError(node, file, `${name} is not supported as an inline directive`);
    }

    // Preserve unsupported inline directives like "ISO/IEC 29115:2013" as literal text.
    node.type = 'text';
    node.value = `:${node.name}`;
    delete node.name;
    delete node.attributes;
    delete node.children;
    delete node.data;
    return;
  }

  if (node.type === 'containerDirective') {
    const name = node.name?.toLowerCase();
    if (name === 'tabbed-example') {
      transformTabbedExample(node, file, state);
      node.children.forEach((tabNode) => {
        if (Array.isArray(tabNode.children)) {
          tabNode.children.forEach((child) => transformDirectiveNode(child, file, state));
        }
      });
      return;
    } else if (name === 'tab') {
      throw directiveError(node, file, 'tab directives must be nested inside a tabbed-example directive');
    } else if (name && KNOWN_DIRECTIVES.has(name)) {
      const { labelChildren, hasCustomTitle } = extractLabelNode(node);
      const chipLabel = DEFAULT_LABELS[name] || name;
      const chipNode = {
        type: 'html',
        value: `<span class="directive-chip directive-chip-${name}">${escapeHtml(chipLabel)}</span>`,
      };

      node.data = node.data || {};
      node.data.hName = 'div';
      node.data.hProperties = {
        className: `directive directive-${name}`,
      };

      if (hasCustomTitle) {
        node.children.unshift(
          chipNode,
          { type: 'html', value: '<span class="directive-title">' },
          ...labelChildren.map((child) => ({ ...child })),
          { type: 'html', value: '</span>' },
        );
      } else {
        node.children.unshift(chipNode);
      }
    }
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => transformDirectiveNode(child, file, state));
  }
}

export function remarkDirectiveHandler() {
  return (tree, file) => {
    const state = {
      tabbedExampleIndex: 1,
    };

    transformDirectiveNode(tree, file, state);
  };
}

function parseDirectiveLine(line, directiveName) {
  const match = line.match(new RegExp(`^(:{3,})${directiveName}(?:\\[([^\\]]+)\\])?(?:\\{([^}]*)\\})?\\s*$`, 'i'));
  if (!match) {
    return null;
  }

  const attributes = {};
  const rawAttributes = match[3] || '';
  for (const attrMatch of rawAttributes.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
  }

  return {
    marker: match[1],
    label: (match[2] || '').trim(),
    attributes,
  };
}

function isFenceStart(line) {
  return FENCE_START_PATTERN.test(line);
}

function fenceMarker(line) {
  return line.match(FENCE_START_PATTERN)?.[2]?.[0] ?? null;
}

function isFenceEnd(line, marker) {
  return marker ? new RegExp(`^\\s*${marker}{3,}`).test(line) : false;
}

function findClosingMarker(lines, startIndex, marker) {
  let fence = null;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (fence) {
      if (isFenceEnd(line, fence)) {
        fence = null;
      }
      continue;
    }

    if (isFenceStart(line)) {
      fence = fenceMarker(line);
      continue;
    }

    if (line.trim() === marker) {
      return index;
    }
  }

  return -1;
}

function lowerTabbedExample(lines, startIndex, filePath = 'MDX source') {
  const group = parseDirectiveLine(lines[startIndex], 'tabbed-example');
  if (!group?.label) {
    throw new Error(`${filePath}:${startIndex + 1}: tabbed-example requires a plain-text label`);
  }

  const output = [];
  const groupEnd = findClosingMarker(lines, startIndex + 1, group.marker);
  if (groupEnd === -1) {
    throw new Error(`${filePath}:${startIndex + 1}: tabbed-example is missing closing ${group.marker}`);
  }

  output.push(`**${group.label}**`, '');

  let index = startIndex + 1;
  while (index < groupEnd) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const tab = parseDirectiveLine(lines[index], 'tab');
    if (!tab?.label) {
      throw new Error(`${filePath}:${index + 1}: tabbed-example may contain only tab directives`);
    }

    const tabEnd = findClosingMarker(lines, index + 1, tab.marker);
    if (tabEnd === -1 || tabEnd > groupEnd) {
      throw new Error(`${filePath}:${index + 1}: tab is missing closing ${tab.marker}`);
    }

    const heading = normalizeAttribute(tab.attributes.heading);
    const level = normalizeHeadingLevel(tab.attributes.level, null, null);
    const subtitle = normalizeAttribute(tab.attributes.subtitle);
    const summary = subtitle ? `${tab.label} — ${subtitle}` : tab.label;
    const body = lines.slice(index + 1, tabEnd).join('\n');
    const loweredBody = lowerDirectivesToMarkdown(body, { filePath }).trim();

    if (heading) {
      output.push(`${'#'.repeat(level)} ${heading}`, '');
    }

    output.push('<details>');
    output.push(`<summary><strong>${escapeHtml(summary)}</strong></summary>`, '');
    if (loweredBody) {
      output.push(loweredBody, '');
    }
    output.push('</details>', '');
    index = tabEnd + 1;
  }

  return {
    nextIndex: groupEnd + 1,
    lines: output,
  };
}

function lowerKnownDirective(lines, startIndex) {
  const startMatch = lines[startIndex].match(/^:::(warning|note|info|tip|remark|important|caution)(?:\[(.+?)\])?\s*$/i);
  if (!startMatch) {
    return null;
  }

  const type = startMatch[1].toLowerCase();
  const title = startMatch[2]?.trim() || '';
  const body = [];
  let index = startIndex + 1;

  while (index < lines.length && !/^:::\s*$/.test(lines[index])) {
    body.push(lines[index]);
    index += 1;
  }

  const label = DEFAULT_LABELS[type] || type;
  const output = [`> **${title ? `${label} — ${title}` : label}**`];

  if (body.length) {
    output.push('>');
    for (const line of body) {
      output.push(line.trim() ? `> ${line}` : '>');
    }
  }

  return {
    nextIndex: index + 1,
    lines: output,
  };
}

export function lowerDirectivesToMarkdown(input, options = {}) {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const output = [];
  const filePath = options.filePath || 'MDX source';
  let fence = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (fence) {
      output.push(line);
      if (isFenceEnd(line, fence)) {
        fence = null;
      }
      continue;
    }

    if (isFenceStart(line)) {
      fence = fenceMarker(line);
      output.push(line);
      continue;
    }

    if (parseDirectiveLine(line, 'tabbed-example')) {
      const lowered = lowerTabbedExample(lines, i, filePath);
      output.push(...lowered.lines);
      i = lowered.nextIndex - 1;
      continue;
    }

    const loweredDirective = lowerKnownDirective(lines, i);
    if (loweredDirective) {
      output.push(...loweredDirective.lines);
      i = loweredDirective.nextIndex - 1;
      continue;
    }

    if (parseDirectiveLine(line, 'tab')) {
      throw new Error(`${filePath}:${i + 1}: tab directives must be nested inside a tabbed-example directive`);
    }

    output.push(lines[i]);
  }

  return output.join('\n');
}
