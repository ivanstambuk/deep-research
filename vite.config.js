import { defineConfig } from 'vite';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function normalizeBasePath(value) {
  const trimmed = (value || '/').trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const base = normalizeBasePath(process.env.DR_BASE_PATH || '/');
const DEFAULT_SITE_TITLE = 'Deep Research Pro';
const INDEX_TEMPLATE_PATH = path.resolve(process.cwd(), 'index.html');
const GENERATED_DOCUMENTS_DIR = path.resolve(process.cwd(), 'src', 'generated', 'documents');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function stripBasePath(pathname, basePath) {
  if (basePath === '/' || !pathname.startsWith(basePath)) {
    return pathname;
  }

  const stripped = pathname.slice(basePath.length - 1);
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

function sanitizeDescription(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateDescription(value, maxLength = 220) {
  const normalized = sanitizeDescription(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildRouteMetadataIndex() {
  const routeMetadata = new Map();

  if (!existsSync(GENERATED_DOCUMENTS_DIR)) {
    return routeMetadata;
  }

  for (const entry of readdirSync(GENERATED_DOCUMENTS_DIR)) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const shell = JSON.parse(readFileSync(path.join(GENERATED_DOCUMENTS_DIR, entry), 'utf8'));
    const documentTitle = String(shell.title ?? shell.slug ?? DEFAULT_SITE_TITLE).trim();
    const documentSummary = truncateDescription(
      shell.summary || `Read ${documentTitle} in ${DEFAULT_SITE_TITLE}.`,
    );
    const slug = String(shell.slug ?? '').trim();

    if (!slug) {
      continue;
    }

    routeMetadata.set(`/${slug}`, {
      title: documentTitle,
      description: documentSummary,
    });

    for (const chapter of shell.chapters ?? []) {
      const chapterId = String(chapter.chapterId ?? '').trim();
      const chapterTitle = String(chapter.title ?? '').trim();

      if (!chapterId || !chapterTitle) {
        continue;
      }

      routeMetadata.set(`/${slug}/${chapterId}`, {
        title: `${chapterTitle} · ${documentTitle}`,
        description: truncateDescription(
          `Read “${chapterTitle}” from ${documentTitle}. ${documentSummary}`,
        ),
      });
    }
  }

  return routeMetadata;
}

function resolveRouteMetadata(pathname, basePath) {
  const normalizedPath = stripBasePath(pathname, basePath).replace(/\/+$/, '') || '/';
  return buildRouteMetadataIndex().get(normalizedPath) ?? null;
}

function injectRouteMetadata(html, metadata) {
  if (!metadata?.title) {
    return html;
  }

  const title = escapeHtml(metadata.title);
  const description = escapeHtml(sanitizeDescription(metadata.description || metadata.title));
  const replacements = [
    [/<title>.*?<\/title>/is, `<title>${title}</title>`],
    [/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`],
    [/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`],
    [/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`],
    [/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`],
    [/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`],
  ];

  return replacements.reduce(
    (currentHtml, [pattern, replacement]) => currentHtml.replace(pattern, replacement),
    html,
  );
}

function githubPagesSpaFallbackPlugin(basePath) {
  const template = readFileSync(new URL('./404.html', import.meta.url), 'utf8');

  return {
    name: 'github-pages-spa-fallback',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: template.replaceAll('%BASE_URL%', basePath),
      });
    },
  };
}

function readerRouteMetadataPlugin(basePath) {
  let resolvedConfig = null;

  return {
    name: 'reader-route-metadata',
    configResolved(config) {
      resolvedConfig = config;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' || !req.url) {
          next();
          return;
        }

        const accept = String(req.headers.accept ?? '');
        if (!accept.includes('text/html')) {
          next();
          return;
        }

        const requestUrl = new URL(req.url, 'http://reader.local');
        const metadata = resolveRouteMetadata(requestUrl.pathname, basePath);

        if (!metadata) {
          next();
          return;
        }

        try {
          const templateHtml = readFileSync(INDEX_TEMPLATE_PATH, 'utf8');
          const transformed = await server.transformIndexHtml(requestUrl.pathname, templateHtml);
          const html = injectRouteMetadata(transformed, metadata);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (error) {
          next(error);
        }
      });
    },
    writeBundle() {
      if (!resolvedConfig) {
        return;
      }

      const outDir = path.resolve(resolvedConfig.root ?? process.cwd(), resolvedConfig.build.outDir);
      const indexHtmlPath = path.join(outDir, 'index.html');
      if (!existsSync(indexHtmlPath)) {
        return;
      }

      const indexHtml = readFileSync(indexHtmlPath, 'utf8');
      const routeMetadata = buildRouteMetadataIndex();
      for (const [routePath, metadata] of routeMetadata.entries()) {
        const relativePath = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
        if (!relativePath) {
          continue;
        }

        const outputDir = path.join(outDir, relativePath);
        mkdirSync(outputDir, { recursive: true });
        writeFileSync(
          path.join(outputDir, 'index.html'),
          injectRouteMetadata(indexHtml, metadata),
        );
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    {enforce: 'pre', ...mdx({
      format: 'md',
      mdExtensions: ['.md', '.markdown', '.mdx'],
      mdxExtensions: [],
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex]
    })},
    react(),
    readerRouteMetadataPlugin(base),
    githubPagesSpaFallbackPlugin(base),
  ],
  server: {
    host: '127.0.0.1',
    port: 4322,
    strictPort: true,
    allowedHosts: ['alfred-server.taild8e5b6.ts.net', '100.77.70.81'],
  },
  preview: {
    host: '127.0.0.1',
    port: 4322,
    strictPort: true,
  },
});
