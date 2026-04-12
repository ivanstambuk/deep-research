export function scrollIntoViewWithOffset(element, offset = 0, behavior = 'auto') {
  element.scrollIntoView({ block: 'start', behavior });

  if (!offset) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.scrollBy({ top: -offset, behavior: 'auto' });

    window.requestAnimationFrame(() => {
      let absoluteTop = 0;
      let current = element;

      while (current) {
        absoluteTop += current.offsetTop ?? 0;
        current = current.offsetParent;
      }

      const desiredTop = Math.max(0, absoluteTop - offset);
      if (Math.abs(window.scrollY - desiredTop) > 24) {
        window.scrollTo({ top: desiredTop, behavior: 'auto' });
      }
    });
  });
}
