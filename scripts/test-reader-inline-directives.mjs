import process from 'process';
import { unified } from 'unified';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { lowerDirectivesToMarkdown, remarkDirectiveHandler } from './directives.js';
import { rehypeHighlightOptions } from './highlight-languages.js';
import { rehypeDecodeCodeEntities } from './rehype-code-entities.js';

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkDirectiveHandler)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeDecodeCodeEntities)
    .use(rehypeHighlight, rehypeHighlightOptions)
    .use(rehypeStringify);
}

async function render(markdown) {
  const file = await createProcessor().process(markdown);
  return String(file);
}

async function main() {
  const standardHtml = await render(
    'ISO/IEC 29115:2013 — *Information technology — Security techniques — Entity authentication assurance framework* — provides an internationally standardised framework.',
  );

  if (!standardHtml.includes('ISO/IEC 29115:2013')) {
    throw new Error(`Expected inline standard reference to remain intact, got: ${standardHtml}`);
  }

  if (standardHtml.includes('<div></div>')) {
    throw new Error(`Unexpected empty directive artifact in rendered HTML: ${standardHtml}`);
  }

  const inlineCodeHtml = await render('The envelope element is `<saml:Assertion>`.');

  if (!inlineCodeHtml.includes('saml:Assertion') || inlineCodeHtml.includes('&amp;lt;') || inlineCodeHtml.includes('&#x26;lt;')) {
    throw new Error(`Expected inline code entity normalization, got: ${inlineCodeHtml}`);
  }

  const xmlFenceHtml = await render('```xml\n&lt;saml:Assertion ID=\"abc\">&lt;/saml:Assertion>\n```');

  if (xmlFenceHtml.includes('&#x26;lt;') || xmlFenceHtml.includes('&amp;lt;')) {
    throw new Error(`Expected code fence entities to be decoded before highlighting, got: ${xmlFenceHtml}`);
  }

  const zigFenceHtml = await render('```zig\nconst std = @import("std");\npub fn main() void {}\n```');

  if (
    !zigFenceHtml.includes('language-zig') ||
    !zigFenceHtml.includes('hljs-keyword') ||
    !zigFenceHtml.includes('hljs-built_in')
  ) {
    throw new Error(`Expected Zig code fences to be highlighted, got: ${zigFenceHtml}`);
  }

  const adaFenceHtml = await render('```ada\nprocedure Hello is\nbegin\n   null;\nend Hello;\n```');

  if (!adaFenceHtml.includes('language-ada') || !adaFenceHtml.includes('hljs-keyword')) {
    throw new Error(`Expected Ada code fences to be highlighted, got: ${adaFenceHtml}`);
  }

  const nimFenceHtml = await render('```nim\nproc fibonacci(n: static int): int =\n  if n <= 1: return n\n  return fibonacci(n - 1)\n```');

  if (
    !nimFenceHtml.includes('language-nim') ||
    !nimFenceHtml.includes('hljs-keyword') ||
    !nimFenceHtml.includes('hljs-type') ||
    !nimFenceHtml.includes('hljs-number')
  ) {
    throw new Error(`Expected Nim code fences to be highlighted, got: ${nimFenceHtml}`);
  }

  const directiveHtml = await render(':::note\nDirective body\n:::');

  if (!directiveHtml.includes('directive directive-note')) {
    throw new Error(`Expected supported admonition directive to render, got: ${directiveHtml}`);
  }

  const tabbedExample = [
    '::::tabbed-example[Manual memory management examples]{persist="dr-0006-memory-management"}',
    ':::tab[C++23]{key="cpp" subtitle="RAII, unique_ptr" heading="5.2.2 C++23: RAII and Smart Pointers" anchor="522-c23-raii-and-smart-pointers" level="5"}',
    '```cpp',
    'int main() { return 0; }',
    ':::not-a-directive-inside-code',
    '```',
    ':::',
    '',
    ':::tab[Zig 0.14]{key="zig" subtitle="Allocator interface"}',
    'Zig body',
    ':::',
    '::::',
  ].join('\n');
  const tabbedHtml = await render(tabbedExample);

  if (
    !tabbedHtml.includes('class="tabbed-example-group"') ||
    !tabbedHtml.includes('role="tablist"') ||
    !tabbedHtml.includes('role="tab"') ||
    !tabbedHtml.includes('role="tabpanel"') ||
    !tabbedHtml.includes('aria-selected="true"') ||
    !tabbedHtml.includes('aria-selected="false"') ||
    !tabbedHtml.includes('hidden') ||
    !tabbedHtml.includes('id="522-c23-raii-and-smart-pointers"') ||
    !tabbedHtml.includes('language-cpp')
  ) {
    throw new Error(`Expected tabbed example HTML to render with accessible tabs and preserved code, got: ${tabbedHtml}`);
  }

  const loweredTabbedExample = lowerDirectivesToMarkdown(tabbedExample);

  if (
    loweredTabbedExample.includes('::::tabbed-example') ||
    loweredTabbedExample.includes(':::tab[') ||
    !loweredTabbedExample.includes('##### 5.2.2 C++23: RAII and Smart Pointers') ||
    !loweredTabbedExample.includes('<details>') ||
    !loweredTabbedExample.includes('<summary><strong>C++23 — RAII, unique_ptr</strong></summary>') ||
    !loweredTabbedExample.includes(':::not-a-directive-inside-code')
  ) {
    throw new Error(`Expected tabbed example Markdown fallback to preserve readable details and code fences, got: ${loweredTabbedExample}`);
  }

  let malformedTabFailed = false;
  try {
    lowerDirectivesToMarkdown(':::tab[Loose tab]{key="loose"}\nBody\n:::');
  } catch {
    malformedTabFailed = true;
  }

  if (!malformedTabFailed) {
    throw new Error('Expected loose tab directive to fail Markdown lowering');
  }

  console.log('[reader smoke] inline directive parsing checks passed');
}

main().catch((error) => {
  console.error('[reader smoke] inline directive parsing checks failed');
  console.error(error);
  process.exitCode = 1;
});
