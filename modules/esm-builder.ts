import { resolve } from 'node:path';

import { build, mergeConfig, type InlineConfig } from 'vite';
import type { ContentScriptEntrypoint } from 'wxt';
import { defineWxtModule } from 'wxt/modules';

const CONTENT_SCRIPT_NAME = 'github-pr';
const ESM_ENTRY = 'overlay.tsx';
const ESM_OUTPUT = 'overlay.js';

export default defineWxtModule((wxt) => {
  let baseViteConfig: InlineConfig;
  wxt.hooks.hook('vite:build:extendConfig', ([entrypoint], config) => {
    if (entrypoint.name === CONTENT_SCRIPT_NAME) {
      baseViteConfig = config;
    }
  });

  const buildEsmOverlay = async () => {
    if (!baseViteConfig) {
      return;
    }

    wxt.logger.info('`[esm-builder]` Building overlay ESM module...');
    const overlayConfig: InlineConfig = {
      esbuild: {
        footer: '',
      },
      build: {
        lib: {
          entry: resolve(wxt.config.entrypointsDir, `${CONTENT_SCRIPT_NAME}.content`, ESM_ENTRY),
          fileName: 'overlay',
          formats: ['es'],
          name: '_gprvOverlay',
        },
        rollupOptions: {
          output: {
            entryFileNames: ESM_OUTPUT,
            assetFileNames: '[name][extname]',
          },
        },
        outDir: resolve(wxt.config.outDir, 'content-scripts/esm'),
      },
    };

    await build(mergeConfig(baseViteConfig, overlayConfig));
    wxt.logger.success('`[esm-builder]` Overlay ESM module built.');
  };

  let contentScriptEntrypoint: ContentScriptEntrypoint | undefined;
  wxt.hooks.hook('entrypoints:resolved', (_, entrypoints) => {
    contentScriptEntrypoint = entrypoints.find(
      (entrypoint) => entrypoint.name === CONTENT_SCRIPT_NAME,
    ) as ContentScriptEntrypoint | undefined;
  });

  wxt.hooks.hook('build:done', () => buildEsmOverlay());

  wxt.hooks.hookOnce('build:done', () => {
    const esmBase = resolve(wxt.config.entrypointsDir, `${CONTENT_SCRIPT_NAME}.content`);
    const ignoredFiles = new Set([resolve(esmBase, 'index.tsx')]);
    wxt.server?.watcher.on('all', async (_, file) => {
      if (!file.startsWith(esmBase) || ignoredFiles.has(file)) {
        return;
      }

      await buildEsmOverlay();
      if (!contentScriptEntrypoint) {
        return;
      }

      wxt.server?.reloadContentScript({
        contentScript: {
          matches: contentScriptEntrypoint.options.matches,
          js: [`/content-scripts/${CONTENT_SCRIPT_NAME}.js`],
        },
      });
      wxt.logger.success('`[esm-builder]` Reloaded content script after overlay change.');
    });
  });

  wxt.hooks.hook('build:manifestGenerated', (_, manifest) => {
    const matches = contentScriptEntrypoint?.options.matches;
    if (!matches?.length) {
      return;
    }

    manifest.web_accessible_resources ??= [];
    // @ts-expect-error WXT MV2/MV3 web_accessible_resources union
    manifest.web_accessible_resources.push({
      matches,
      resources: ['/content-scripts/esm/*'],
    });
  });

  wxt.hooks.hook('prepare:publicPaths', (_, paths) => {
    paths.push(`content-scripts/esm/${ESM_OUTPUT}`);
  });
});
