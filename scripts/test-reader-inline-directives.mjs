import process from 'process';
import { unified } from 'unified';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveHandler } from './directives.js';
import { rehypeDecodeCodeEntities } from './rehype-code-entities.js';

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkDirectiveHandler)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeDecodeCodeEntities)
    .use(rehypeHighlight, { ignoreMissing: true })
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

  const directiveHtml = await render(':::note\nDirective body\n:::');

  if (!directiveHtml.includes('directive directive-note')) {
    throw new Error(`Expected supported admonition directive to render, got: ${directiveHtml}`);
  }

  console.log('[reader smoke] inline directive parsing checks passed');
}

main().catch((error) => {
  console.error('[reader smoke] inline directive parsing checks failed');
  console.error(error);
  process.exitCode = 1;
});
