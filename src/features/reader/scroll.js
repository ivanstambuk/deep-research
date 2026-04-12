export function scrollIntoViewWithOffset(element, offset = 0, behavior = 'auto') {
  const rect = element.getBoundingClientRect();
  const desiredTop = Math.max(0, window.scrollY + rect.top - offset);
  window.scrollTo({ top: desiredTop, behavior });
}
