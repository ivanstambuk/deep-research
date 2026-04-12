export function classifyTargetContentClass({
  containsMermaid = false,
  tableCount = 0,
} = {}) {
  if (containsMermaid && tableCount > 0) {
    return 'mixed';
  }

  if (containsMermaid) {
    return 'mermaid';
  }

  if (tableCount > 0) {
    return 'heavy_table';
  }

  return 'plain';
}

export function isHeavyTargetContentClass(contentClass) {
  return contentClass === 'mermaid' || contentClass === 'heavy_table' || contentClass === 'mixed';
}
