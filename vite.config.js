import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  plugins: [
    {enforce: 'pre', ...mdx({
      format: 'md',
      mdExtensions: ['.md', '.markdown', '.mdx'],
      mdxExtensions: [],
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex]
    })},
    react()
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
