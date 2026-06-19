// vitest.config.ts
import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  resolve: {
    alias: {
      '@pierre/diffs/dist/style.js': resolve(__dirname, 'node_modules/@pierre/diffs/dist/style.js'),
    },
  },
});
