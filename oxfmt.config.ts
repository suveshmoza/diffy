import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 100,
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  sortImports: true,
  sortPackageJson: true,
  jsxSingleQuote: true,
  singleAttributePerLine: true,
  ignorePatterns: ['node_modules', '.output', '.wxt', 'dist', 'pnpm-lock.yaml'],
});
