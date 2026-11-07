import { readFile, readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

import { bundledLanguagesInfo, bundledThemes } from 'shiki';
import { defineWxtModule } from 'wxt/modules';

import allowedLangIds from '../domains/diff/highlighting/lang-ids.json' with { type: 'json' };

/** Map Shiki alias (and id) → canonical language id. */
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const info of bundledLanguagesInfo) {
  ALIAS_TO_CANONICAL.set(info.id, info.id);
  for (const alias of info.aliases ?? []) {
    ALIAS_TO_CANONICAL.set(alias, info.id);
  }
}

/** Canonical ids from the hand-maintained allowlist. */
const ALLOWED_CANONICAL = new Set(allowedLangIds.map((id) => ALIAS_TO_CANONICAL.get(id) ?? id));

const BUNDLED_THEME_STEMS = new Set(Object.keys(bundledThemes));

/** Vite app chunks that are not Shiki grammars/themes — always keep. */
const KEEP_BUNDLE_STEMS = new Set(['overlay', 'popup', 'jsx-runtime']);

/** Vite default chunk hash: 8 chars from [A-Za-z0-9_-]. */
const VITE_CHUNK_HASH_RE = /-[A-Za-z0-9_-]{8}\.js$/;

function resolveLangCanonical(stem: string): string {
  return ALIAS_TO_CANONICAL.get(stem) ?? stem;
}

function getShikiChunkStem(filename: string): string | null {
  if (!filename.endsWith('.js')) {
    return null;
  }
  const match = filename.match(VITE_CHUNK_HASH_RE);
  if (!match) {
    return null;
  }
  return filename.slice(0, match.index);
}

function isAllowedLangStem(stem: string): boolean {
  return ALLOWED_CANONICAL.has(resolveLangCanonical(stem));
}

function isShikiChunkToKeep(stem: string): boolean {
  if (KEEP_BUNDLE_STEMS.has(stem)) {
    return true;
  }

  if (stem === 'worker' || stem === 'wasm') {
    return true;
  }

  if (BUNDLED_THEME_STEMS.has(stem)) {
    return true;
  }

  return isAllowedLangStem(stem);
}

async function pruneUnusedShikiChunks(
  chunksDir: string,
  logger: { success: (msg: string) => void },
) {
  let entries: string[];
  try {
    entries = await readdir(chunksDir);
  } catch {
    return;
  }

  const fileSet = new Set(entries);
  const keep = new Set<string>();
  const queue: string[] = [];

  const keepOnly = (name: string) => {
    if (fileSet.has(name)) {
      keep.add(name);
    }
  };

  const keepAndFollow = (name: string) => {
    if (!fileSet.has(name) || keep.has(name)) {
      return;
    }
    keep.add(name);
    queue.push(name);
  };

  for (const name of entries) {
    const stem = getShikiChunkStem(name);
    if (stem == null) {
      keepOnly(name);
    } else if (isShikiChunkToKeep(stem)) {
      keepAndFollow(name);
    }
  }

  const specifierRe = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;
  while (queue.length > 0) {
    const name = queue.pop();
    if (name == null || !name.endsWith('.js')) {
      continue;
    }

    let code: string;
    try {
      code = await readFile(resolve(chunksDir, name), 'utf-8');
    } catch {
      continue;
    }

    for (const match of code.matchAll(specifierRe)) {
      const base = match[1]?.split('/').pop();
      if (base) {
        keepAndFollow(base);
      }
    }
  }

  let removedCount = 0;
  let removedBytes = 0;
  for (const name of entries) {
    if (keep.has(name) || getShikiChunkStem(name) == null) {
      continue;
    }

    const filePath = resolve(chunksDir, name);
    const stats = await stat(filePath).catch(() => null);
    if (!stats?.isFile()) {
      continue;
    }

    await unlink(filePath);
    removedCount++;
    removedBytes += stats.size;
  }

  if (removedCount > 0) {
    const mb = (removedBytes / 1024 / 1024).toFixed(2);
    logger.success(`\`[shiki-pruner]\` Pruned ${removedCount} unused Shiki chunks (${mb} MB).`);
  }
}

export default defineWxtModule((wxt) => {
  wxt.hooks.hook('build:done', async () => {
    if (wxt.server) {
      return;
    }

    const chunksDir = resolve(wxt.config.outDir, 'chunks');
    await pruneUnusedShikiChunks(chunksDir, wxt.logger);
  });
});
