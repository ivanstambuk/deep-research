function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSearchPattern(query) {
  const tokens = query
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  return new RegExp(tokens.map((token) => escapeRegExp(token)).join('|'), 'ig');
}

export function clearSearchHighlights(root) {
  root.querySelectorAll('.doc-search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }

    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });

  root.querySelectorAll('.doc-search-hit').forEach((element) => {
    element.classList.remove('doc-search-hit');
  });
}

export function highlightElementText(element, query) {
  const pattern = createSearchPattern(query);
  if (!pattern) {
    return false;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.parentElement?.closest('mark')) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  let matched = false;

  nodes.forEach((node) => {
    const text = node.nodeValue ?? '';
    pattern.lastIndex = 0;

    if (!pattern.test(text)) {
      return;
    }

    matched = true;
    pattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const value = match[0] ?? '';

      if (index > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, index)));
      }

      const mark = document.createElement('mark');
      mark.className = 'doc-search-highlight';
      mark.textContent = value;
      fragment.append(mark);
      lastIndex = index + value.length;
    }

    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  if (matched) {
    element.classList.add('doc-search-hit');
  }

  return matched;
}
