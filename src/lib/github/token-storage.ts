const GITHUB_TOKEN_KEY = 'githubToken';
const GITHUB_TOKEN_VIEWER_KEY = 'githubTokenViewer';

let migrationPromise: Promise<void> | null = null;

async function migrateFromSyncIfNeeded(): Promise<void> {
  if (!browser?.storage?.local || !browser?.storage?.sync) {
    return;
  }

  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    const local = await browser.storage.local.get([GITHUB_TOKEN_KEY, GITHUB_TOKEN_VIEWER_KEY]);
    const hasLocalToken =
      typeof local[GITHUB_TOKEN_KEY] === 'string' && local[GITHUB_TOKEN_KEY].trim();

    if (hasLocalToken) {
      await browser.storage.sync.remove([GITHUB_TOKEN_KEY, GITHUB_TOKEN_VIEWER_KEY]);
      return;
    }

    const sync = await browser.storage.sync.get([GITHUB_TOKEN_KEY, GITHUB_TOKEN_VIEWER_KEY]);
    const hasSyncToken =
      typeof sync[GITHUB_TOKEN_KEY] === 'string' && sync[GITHUB_TOKEN_KEY].trim();
    const hasSyncViewer = typeof sync[GITHUB_TOKEN_VIEWER_KEY] === 'string';

    if (!hasSyncToken && !hasSyncViewer) {
      return;
    }

    const toLocal: Record<string, string> = {};
    if (hasSyncToken) {
      toLocal[GITHUB_TOKEN_KEY] = sync[GITHUB_TOKEN_KEY] as string;
    }
    if (hasSyncViewer) {
      toLocal[GITHUB_TOKEN_VIEWER_KEY] = sync[GITHUB_TOKEN_VIEWER_KEY] as string;
    }

    await browser.storage.local.set(toLocal);
    await browser.storage.sync.remove([GITHUB_TOKEN_KEY, GITHUB_TOKEN_VIEWER_KEY]);
  })();

  return migrationPromise;
}

export async function readGitHubTokenCredentials(): Promise<{
  token: string | null;
  viewerJson: string | null;
}> {
  if (!browser?.storage?.local) {
    return { token: null, viewerJson: null };
  }

  await migrateFromSyncIfNeeded();

  const stored = await browser.storage.local.get([GITHUB_TOKEN_KEY, GITHUB_TOKEN_VIEWER_KEY]);
  const token =
    typeof stored[GITHUB_TOKEN_KEY] === 'string' && stored[GITHUB_TOKEN_KEY].trim()
      ? stored[GITHUB_TOKEN_KEY].trim()
      : null;
  const viewerJson =
    typeof stored[GITHUB_TOKEN_VIEWER_KEY] === 'string' ? stored[GITHUB_TOKEN_VIEWER_KEY] : null;

  return { token, viewerJson };
}

export async function readGitHubToken(): Promise<string | null> {
  const { token } = await readGitHubTokenCredentials();
  return token;
}

export async function setGitHubToken(token: string): Promise<void> {
  if (!browser?.storage?.local) {
    throw new Error('Extension storage is unavailable.');
  }

  await browser.storage.local.set({ [GITHUB_TOKEN_KEY]: token });
}

export async function setGitHubTokenViewer(viewerJson: string): Promise<void> {
  if (!browser?.storage?.local) {
    throw new Error('Extension storage is unavailable.');
  }

  await browser.storage.local.set({ [GITHUB_TOKEN_VIEWER_KEY]: viewerJson });
}

export async function removeGitHubTokenViewer(): Promise<void> {
  if (!browser?.storage?.local) {
    return;
  }

  await browser.storage.local.remove(GITHUB_TOKEN_VIEWER_KEY);
}

export async function clearGitHubToken(): Promise<void> {
  if (!browser?.storage?.local) {
    return;
  }

  await browser.storage.local.remove([GITHUB_TOKEN_KEY, GITHUB_TOKEN_VIEWER_KEY]);
}

export function subscribeToGitHubTokenChanges(listener: () => void): () => void {
  if (!browser?.storage?.onChanged) {
    return () => undefined;
  }

  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[GITHUB_TOKEN_KEY]) {
      listener();
    }
  };

  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
