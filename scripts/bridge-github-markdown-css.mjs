import fs from 'node:fs';

const light = fs.readFileSync('node_modules/github-markdown-css/github-markdown-light.css', 'utf8');
const dark = fs
  .readFileSync('node_modules/github-markdown-css/github-markdown-dark.css', 'utf8')
  .replaceAll('.markdown-body', '.dark .markdown-body');

fs.writeFileSync(
  'src/entrypoints/github-pr.content/github-markdown-bridged.css',
  [
    '/* Generated from github-markdown-css. Regenerate: node scripts/bridge-github-markdown-css.mjs */',
    light,
    dark,
  ].join('\n'),
);
