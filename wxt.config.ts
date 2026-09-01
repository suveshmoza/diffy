import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'wxt';

/** Stable output path for Pierre's portable highlighter worker (see src/lib/diff/worker.ts). */
const DIFF_WORKER_DEST = 'diff-highlighter-worker.js';

function escapeToAscii(code: string): string {
  return code
    .split('')
    .map((ch) =>
      ch.charCodeAt(0) <= 0x7f ? ch : '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4),
    )
    .join('');
}

/** Chrome rejects content scripts with non-ASCII bytes (e.g. Shiki grammars). */
function toAscii(): Plugin {
  return {
    name: 'vite-plugin-to-ascii',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const fileName in bundle) {
        if (!fileName.startsWith('src/content-scripts/') || !fileName.endsWith('.js')) continue;
        const chunk = bundle[fileName];
        if (chunk != null && chunk.type === 'chunk') {
          chunk.code = escapeToAscii(chunk.code);
        }
      }
    },
    async writeBundle(options, bundle) {
      const outDir = options.dir;
      if (!outDir) return;

      for (const fileName in bundle) {
        if (!fileName.startsWith('src/content-scripts/') || !fileName.endsWith('.js')) continue;
        const path = resolve(outDir, fileName);
        const code = await readFile(path, 'utf-8');
        const ascii = escapeToAscii(code);
        if (ascii !== code) await writeFile(path, ascii, 'utf-8');
      }
    },
  };
}

function tolerateNullCustomElements(): Plugin {
  return {
    name: 'tolerate-null-custom-elements',
    transform(code, id) {
      if (!/@pierre\/(diffs|trees)\/dist\/components\/web-components\.js/.test(id)) {
        return;
      }

      return {
        code: code
          .replace(
            'if (typeof HTMLElement !== "undefined" && customElements.get(DIFFS_TAG_NAME) == null) {',
            'if (typeof HTMLElement !== "undefined" && globalThis.customElements != null && globalThis.customElements.get(DIFFS_TAG_NAME) == null) {',
          )
          .replace(
            'if (typeof HTMLElement !== "undefined" && customElements.get(FILE_TREE_TAG_NAME) == null) {',
            'if (typeof HTMLElement !== "undefined" && globalThis.customElements != null && globalThis.customElements.get(FILE_TREE_TAG_NAME) == null) {',
          ),
        map: null,
      };
    },
  };
}

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  // Auto-load local modules (relative paths in `modules` break on WXT 0.21 + Node).
  modulesDir: 'src/modules',
  srcDir: 'src',
  outDir: 'dist',
  hooks: {
    // Copy Pierre's self-contained portable worker into the extension at a
    // stable, same-origin path. Runs in both dev and build, so `new Worker()`
    // works identically in `pnpm dev` and `pnpm build` (a bundled `?worker`
    // would be served cross-origin from the dev server and fail to spawn).
    'build:publicAssets'(_wxt, files) {
      files.push({
        absoluteSrc: fileURLToPath(import.meta.resolve('@pierre/diffs/worker/worker-portable.js')),
        relativeDest: DIFF_WORKER_DEST,
      });
    },
  },
  autoIcons: {
    baseIconPath: './assets/logo.png',
  },
  webExt: {
    binaries: process.env.WXT_FIREFOX_BINARY
      ? { firefox: process.env.WXT_FIREFOX_BINARY }
      : undefined,
  },
  manifest: {
    version: '1.4.1',
    name: 'diffy',
    description: 'Fast PR reviews on GitHub, even for large PRs',
    permissions: ['storage', 'contextMenus'],
    host_permissions: [
      'https://api.github.com/*',
      'https://github.com/*',
      'https://fonts.googleapis.com/*',
      'https://fonts.gstatic.com/*',
    ],
    content_security_policy: {
      // Overlay loads Shiki WASM plus Google Fonts for preset code/tree families.
      // Do not set connect-src — it would block HMR (ws://localhost) and other runtime fetches.
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
    },
    web_accessible_resources: [
      {
        resources: ['assets/*.js', 'overlay.html'],
        matches: ['https://github.com/*'],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'diffy@suveshmoza.com',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  vite: () => ({
    // Vite defaults to **/*.html; with outDir `dist` that also picks up built
    // extension HTML and breaks dep scanning (UNRESOLVED_ENTRY under dist/).
    optimizeDeps: {
      entries: ['src/entrypoints/**/*.{html,ts,tsx}'],
    },
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src'),
        '@pierre/diffs/dist/style.js': resolve(
          import.meta.dirname,
          'node_modules/@pierre/diffs/dist/style.js',
        ),
        '@pierre/diffs/theme-resolver': resolve(
          import.meta.dirname,
          'node_modules/@pierre/diffs/dist/highlighter/themes/themeResolver.js',
        ),
      },
    },
    worker: {
      format: 'es',
    },
    plugins: [tailwindcss(), tolerateNullCustomElements(), toAscii()],
  }),
});
