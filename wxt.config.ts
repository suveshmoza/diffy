import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Plugin } from 'vite';
import { defineConfig } from 'wxt';

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
        if (!fileName.startsWith('content-scripts/') || !fileName.endsWith('.js')) continue;
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk') chunk.code = escapeToAscii(chunk.code);
      }
    },
    async writeBundle(options, bundle) {
      const outDir = options.dir;
      if (!outDir) return;

      for (const fileName in bundle) {
        if (!fileName.startsWith('content-scripts/') || !fileName.endsWith('.js')) continue;
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
  autoIcons: {
    baseIconPath: 'assets/logo.jpg',
    sizes: [128, 96, 48, 32, 24, 16],
  },
  webExt: {
    binaries: process.env.WXT_FIREFOX_BINARY
      ? { firefox: process.env.WXT_FIREFOX_BINARY }
      : undefined,
  },
  manifest: {
    version: '1.0.0',
    name: 'diffy',
    description: 'Better PR diffs on GitHub',
    permissions: ['storage'],
    host_permissions: ['https://api.github.com/*', 'https://github.com/*'],
    web_accessible_resources: [
      {
        resources: ['assets/*.js'],
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
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname),
        '@pierre/diffs/dist/style.js': resolve(
          import.meta.dirname,
          'node_modules/@pierre/diffs/dist/style.js',
        ),
      },
    },
    worker: {
      format: 'es',
    },
    plugins: [tolerateNullCustomElements(), toAscii()],
  }),
});
