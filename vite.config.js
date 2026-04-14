import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
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
