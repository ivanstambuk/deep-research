function decodeHtmlEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeCodeDescendants(node, insideCode = false) {
  if (!node || typeof node !== 'object') {
    return;
  }

  const nextInsideCode = insideCode || (node.type === 'element' && node.tagName === 'code');

  if (nextInsideCode && node.type === 'text' && typeof node.value === 'string' && node.value.includes('&')) {
    node.value = decodeHtmlEntities(node.value);
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => normalizeCodeDescendants(child, nextInsideCode));
  }
}

export function rehypeDecodeCodeEntities() {
  return (tree) => {
    normalizeCodeDescendants(tree, false);
  };
}
