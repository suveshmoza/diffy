import { defineConfig } from 'oxfmt';

export default defineConfig({
  singleQuote: true,
  sortImports: true,
  sortPackageJson: true,
  jsxSingleQuote: true,
  singleAttributePerLine: true,
  ignorePatterns: ['node_modules', '.output', '.wxt', 'dist', 'pnpm-lock.yaml'],
});
