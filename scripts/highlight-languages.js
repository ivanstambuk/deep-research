import { common } from 'lowlight';
import ada from 'highlight.js/lib/languages/ada';
import nim from 'highlight.js/lib/languages/nim';
import zig from 'highlightjs-zig';

export const rehypeHighlightOptions = {
  ignoreMissing: true,
  languages: {
    ...common,
    ada,
    nim,
    zig,
  },
  aliases: {
    ada: ['adb', 'ads'],
  },
};
