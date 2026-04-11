import fs from 'fs/promises';
import path from 'path';

function syncVisibleLineCount(output) {
  let next = output;

  for (let i = 0; i < 3; i += 1) {
    const totalLines = next.split('\n').length;
    const rounded = Math.round(totalLines / 100) * 100;
    const replacement = `~${rounded.toLocaleString('en-US')} lines`;
    next = next.replace(/~\d{1,3}(?:,\d{3})* lines/, replacement);
  }

  return next;
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// This script compiles .mdx from `src/papers/` into pure .md in the root `papers/`
async function compileMdxToMarkdown() {
  const srcPapersDir = path.join(process.cwd(), 'src', 'papers');
  const targetPapersDir = path.join(process.cwd(), 'papers');
  const requestedArgs = process.argv.slice(2);

  try {
    // Check if src/papers exists, if not, nothing to do
    await fs.access(srcPapersDir);
  } catch (err) {
    console.log('No src/papers directory found. Skipping compilation.');
    return;
  }

  async function compileFile(entrySrcPath) {
    const relativePath = path.relative(srcPapersDir, entrySrcPath);
    const targetMdPath = path.join(targetPapersDir, relativePath).replace(/\.mdx$/, '.md');

    await fs.mkdir(path.dirname(targetMdPath), { recursive: true });

    console.log(`Compiling: ${entrySrcPath} -> ${targetMdPath}`);

    const fileContent = await fs.readFile(entrySrcPath, 'utf8');
    const frontMatterMatch = fileContent.match(/^---\n[\s\S]*?\n---\n*/);
    const frontMatter = frontMatterMatch ? frontMatterMatch[0].trimEnd() : '';
    const markdownBody = frontMatterMatch
      ? fileContent.slice(frontMatterMatch[0].length)
      : fileContent;
    const header = `<!-- AUTO-GENERATED FROM src/papers/${relativePath}. DO NOT EDIT. -->\n\n`;

    const output = frontMatter
      ? `${frontMatter}\n\n${header}${markdownBody}`
      : `${header}${markdownBody}`;
    await fs.writeFile(targetMdPath, syncVisibleLineCount(output));
  }

  // Recursively process directories
  async function processDirectory(srcPath) {
    const entries = await fs.readdir(srcPath, { withFileTypes: true });

    for (const entry of entries) {
      const entrySrcPath = path.join(srcPath, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(entrySrcPath);
      } else if (entry.name.endsWith('.mdx')) {
        await compileFile(entrySrcPath);
      }
    }
  }

  if (requestedArgs.length > 0) {
    for (const requestedArg of requestedArgs) {
      const resolvedPath = path.resolve(process.cwd(), requestedArg);

      if (!resolvedPath.endsWith('.mdx')) {
        throw new Error(`Expected an .mdx source path, got: ${requestedArg}`);
      }

      if (!isPathInside(resolvedPath, srcPapersDir)) {
        throw new Error(`MDX source must be inside src/papers/: ${requestedArg}`);
      }

      await fs.access(resolvedPath);
      await compileFile(resolvedPath);
    }
  } else {
    await processDirectory(srcPapersDir);
  }
  console.log('MDX to Markdown compilation complete!');
}

compileMdxToMarkdown().catch(console.error);
