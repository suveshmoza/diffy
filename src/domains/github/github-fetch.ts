/** Scoped flag so Refresh fetches use `cache: 'no-store'` without coupling fetch code to query layer. */
let bypassHttpCacheDepth = 0;

export async function withBypassHttpCache<T>(fn: () => Promise<T>): Promise<T> {
  bypassHttpCacheDepth++;
  try {
    return await fn();
  } finally {
    bypassHttpCacheDepth--;
  }
}

export function githubFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const cache: RequestCache = bypassHttpCacheDepth > 0 ? 'no-store' : (init?.cache ?? 'default');
  return fetch(input, { ...init, cache });
}
