import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['oxc', 'typescript', 'unicorn', 'react', 'import', 'promise'],

  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },

  env: {
    browser: true,
  },

  globals: {
    defineContentScript: 'readonly',
  },

  settings: {
    react: {
      version: '19.2.5',
    },
  },

  ignorePatterns: ['.output', '.wxt', 'dist', 'node_modules'],

  rules: {
    'eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'typescript/no-explicit-any': 'error',
    'eslint/no-debugger': 'error',

    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/react-in-jsx-scope': 'off',

    'promise/catch-or-return': 'error',
    'promise/always-return': 'off',

    'import/no-unassigned-import': 'off',
    'import/default': 'off',

    'unicorn/consistent-function-scoping': 'off',
  },

  overrides: [
    {
      files: ['wxt.config.ts', 'oxfmt.config.ts', 'oxlint.config.ts'],
      env: { node: true },
    },
  ],
});
