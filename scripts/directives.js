import { visit } from 'unist-util-visit';

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

function escapeHtml(value) {
  return value
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

export function remarkDirectiveHandler() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') {
        return;
      }

      const name = node.name?.toLowerCase();
      if (!name || !KNOWN_DIRECTIVES.has(name)) {
        return;
      }

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
    });
  };
}

export function lowerDirectivesToMarkdown(input) {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const output = [];

  for (let i = 0; i < lines.length; i += 1) {
    const startMatch = lines[i].match(/^:::(warning|note|info|tip|remark|important|caution)(?:\[(.+?)\])?\s*$/i);

    if (!startMatch) {
      output.push(lines[i]);
      continue;
    }

    const type = startMatch[1].toLowerCase();
    const title = startMatch[2]?.trim() || '';
    const body = [];
    i += 1;

    while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
      body.push(lines[i]);
      i += 1;
    }

    const label = DEFAULT_LABELS[type] || type;
    output.push(`> **${title ? `${label} — ${title}` : label}**`);

    if (body.length) {
      output.push('>');
      for (const line of body) {
        output.push(line.trim() ? `> ${line}` : '>');
      }
    }
  }

  return output.join('\n');
}
