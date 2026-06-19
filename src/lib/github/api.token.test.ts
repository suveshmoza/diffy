import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

async function freshApi() {
  vi.resetModules();
  return import('./api');
}

describe('getGitHubToken', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns null when storage is empty', async () => {
    const { getGitHubToken } = await freshApi();
    await expect(getGitHubToken()).resolves.toBeNull();
  });

  it('returns stored token from storage', async () => {
    await browser.storage.sync.set({ githubToken: 'ghp_abc123' });
    const { getGitHubToken } = await freshApi();
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');
  });

  it('trims whitespace from stored token', async () => {
    await browser.storage.sync.set({ githubToken: '  ghp_abc123  ' });
    const { getGitHubToken } = await freshApi();
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');
  });

  it('returns null for empty string token', async () => {
    await browser.storage.sync.set({ githubToken: '' });
    const { getGitHubToken } = await freshApi();
    await expect(getGitHubToken()).resolves.toBeNull();
  });

  it('returns null for whitespace-only token', async () => {
    await browser.storage.sync.set({ githubToken: '   ' });
    const { getGitHubToken } = await freshApi();
    await expect(getGitHubToken()).resolves.toBeNull();
  });

  it('returns null for non-string stored value', async () => {
    await browser.storage.sync.set({ githubToken: 123 });
    const { getGitHubToken } = await freshApi();
    await expect(getGitHubToken()).resolves.toBeNull();
  });

  it('deduplicates concurrent calls to a single storage read', async () => {
    const { getGitHubToken } = await freshApi();
    await browser.storage.sync.set({ githubToken: 'ghp_abc123' });

    const [first, second] = await Promise.all([getGitHubToken(), getGitHubToken()]);
    expect(first).toBe('ghp_abc123');
    expect(second).toBe('ghp_abc123');
  });

  it('invalidates cache when storage.onChanged fires for githubToken', async () => {
    const { getGitHubToken } = await freshApi();
    await browser.storage.sync.set({ githubToken: 'ghp_abc123' });
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');

    await browser.storage.sync.set({ githubToken: 'ghp_def456' });
    fakeBrowser.storage.onChanged.trigger(
      { githubToken: { newValue: 'ghp_def456', oldValue: 'ghp_abc123' } },
      'sync',
    );
    await expect(getGitHubToken()).resolves.toBe('ghp_def456');
  });

  it('does not invalidate cache for non-token key changes', async () => {
    const { getGitHubToken } = await freshApi();
    await browser.storage.sync.set({ githubToken: 'ghp_abc123' });
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');

    fakeBrowser.storage.onChanged.trigger(
      { otherKey: { newValue: 'foo', oldValue: 'bar' } },
      'sync',
    );
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');
  });

  it('does not invalidate cache for changes in other storage areas', async () => {
    const { getGitHubToken } = await freshApi();
    await browser.storage.sync.set({ githubToken: 'ghp_abc123' });
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');

    fakeBrowser.storage.onChanged.trigger(
      { githubToken: { newValue: 'ghp_def456', oldValue: 'ghp_abc123' } },
      'local',
    );
    await expect(getGitHubToken()).resolves.toBe('ghp_abc123');
  });
});

describe('warmGitHubTokenCache', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('warms the cache without error when storage is empty', async () => {
    const { warmGitHubTokenCache, getGitHubToken } = await freshApi();
    warmGitHubTokenCache();
    await expect(getGitHubToken()).resolves.toBeNull();
  });

  it('warms the cache with a stored token', async () => {
    await browser.storage.sync.set({ githubToken: 'ghp_warm123' });
    const { warmGitHubTokenCache, getGitHubToken } = await freshApi();
    warmGitHubTokenCache();
    await expect(getGitHubToken()).resolves.toBe('ghp_warm123');
  });
});
