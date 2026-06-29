import { Octokit } from '@octokit/rest';

import { githubFetch } from './github-fetch';

type RateLimitHeaders = {
  remaining: number;
  reset: number;
};

const rateLimitListeners = new Set<(state: RateLimitHeaders) => void>();

export function addRateLimitListener(listener: (state: RateLimitHeaders) => void): () => void {
  rateLimitListeners.add(listener);
  return () => {
    rateLimitListeners.delete(listener);
  };
}

function notifyRateLimit(state: RateLimitHeaders): void {
  rateLimitListeners.forEach((listener) => listener(state));
}

function readRateLimitHeaders(headers: Record<string, string>): RateLimitHeaders | null {
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];
  if (remaining === undefined || reset === undefined) {
    return null;
  }

  return {
    remaining: Number.parseInt(remaining, 10),
    reset: Number.parseInt(reset, 10),
  };
}

const UNAUTHENTICATED = '';

const clientByToken = new Map<string, Octokit>();

function instantiateClient(auth?: string): Octokit {
  const octokit = new Octokit({
    auth: auth || undefined,
    request: { fetch: githubFetch },
  });

  octokit.hook.after('request', (response) => {
    const state = readRateLimitHeaders(response.headers as Record<string, string>);
    if (state) {
      notifyRateLimit(state);
    }
  });

  return octokit;
}

export function getOctokitClient(auth?: string): Octokit {
  const key = auth || UNAUTHENTICATED;

  let client = clientByToken.get(key);
  if (!client) {
    client = instantiateClient(auth);
    clientByToken.set(key, client);
  }

  return client;
}

export function resetOctokitClients(): void {
  clientByToken.clear();
}

export function updateRateLimitFromResponse(response: Response): void {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const state = readRateLimitHeaders(headers);
  if (state) {
    notifyRateLimit(state);
  }
}
