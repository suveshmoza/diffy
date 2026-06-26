import { readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { bundledLanguages, bundledThemes } from 'shiki';
import { defineWxtModule } from 'wxt/modules';

import blockedLangIds from '../lib/diff/blocked-lang-ids.json' with { type: 'json' };

/** Shiki chunk stems that alias to a canonical lang id. */
const DIFF_LANG_ALIASES: Record<string, string> = {
  shellscript: 'shell',
  shellsession: 'shell',
  docker: 'dockerfile',
};

function resolveLangCanonical(stem: string): string {
  return DIFF_LANG_ALIASES[stem] ?? stem;
}

const BLOCKED_SHIKI_LANGS = new Set<string>(blockedLangIds);
const BUNDLED_THEME_STEMS = new Set(Object.keys(bundledThemes));
const ALIAS_LANG_KEYS = new Set(Object.keys(DIFF_LANG_ALIASES));

/** Vite app chunks that are not Shiki grammars/themes — always keep. */
const KEEP_BUNDLE_STEMS = new Set(['overlay', 'popup', 'jsx-runtime']);

/** Vite default chunk hash: 8 chars from [A-Za-z0-9_-]. */
const VITE_CHUNK_HASH_RE = /-[A-Za-z0-9_-]{8}\.js$/;

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

function isBlockedLangStem(stem: string): boolean {
  return BLOCKED_SHIKI_LANGS.has(resolveLangCanonical(stem));
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

  return !isBlockedLangStem(stem);
}

function computeWorkerLangIds(): string[] {
  const blocked = BLOCKED_SHIKI_LANGS;
  return Object.keys(bundledLanguages)
    .filter((id) => {
      const canonical = resolveLangCanonical(id);
      if (blocked.has(canonical)) {
        return false;
      }
      if (ALIAS_LANG_KEYS.has(id)) {
        return false;
      }
      return true;
    })
    .toSorted();
}

async function syncWorkerLangIds(
  wxtRoot: string,
  logger: { info: (msg: string) => void },
): Promise<void> {
  const langIds = computeWorkerLangIds();
  const outPath = resolve(wxtRoot, './src/lib/diff/lang-ids.json');
  const next = `${JSON.stringify(langIds, null, 2)}\n`;
  const current = await readFile(outPath, 'utf-8').catch(() => null);
  if (current === next) {
    return;
  }

  await writeFile(outPath, next, 'utf-8');
  logger.info(`\`[shiki-pruner]\` Updated lang-ids.json (${langIds.length} langs).`);
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
      const base = match[1].split('/').pop();
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
    await syncWorkerLangIds(wxt.config.root, wxt.logger);

    if (wxt.server) {
      return;
    }

    const chunksDir = resolve(wxt.config.outDir, 'chunks');
    await pruneUnusedShikiChunks(chunksDir, wxt.logger);
  });
});
