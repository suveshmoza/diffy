export type GitHubPullRequestRef = {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
};

export type GitHubPullRequest = {
  html_url: string;
  title: string;
  number: number;
  state: string;
  draft: boolean;
  user?: { login: string; avatar_url?: string };
  base: { ref: string; sha: string; repo: { full_name: string } };
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  merged_at: string | null;
  body: string | null;
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
};

export type GitHubPullRequestReviewComment = {
  id: number;
  path: string;
  body: string;
  html_url: string;
  user: { login: string; avatar_url?: string };
  created_at: string;
  updated_at: string;
  line: number | null;
  original_line: number | null;
  start_line: number | null;
  original_start_line: number | null;
  side: 'LEFT' | 'RIGHT' | null;
  in_reply_to_id: number | null;
  pull_request_review_id?: number | null;
  is_minimized?: boolean;
  minimized_reason?: string | null;
  hidden?: boolean;
};

type ReviewCommentsFetchResult = {
  comments: GitHubPullRequestReviewComment[];
  loadError: string | null;
};

export type GitHubPullRequestFile = {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
};

export type PullRequestDiffData = {
  ref: GitHubPullRequestRef;
  pullRequest: GitHubPullRequest;
  files: GitHubPullRequestFile[];
  patch: string;
  reviewComments: GitHubPullRequestReviewComment[];
  reviewCommentsLoadError: string | null;
};

export type RateLimitState = {
  remaining: number;
  reset: number;
};

export type LoadProgress = {
  phase: 'metadata' | 'files' | 'comments' | 'diff' | 'building';
  loaded: number;
  total: number;
};

let latestLoadProgress: LoadProgress | null = null;
const loadProgressListeners = new Set<() => void>();

function updateLoadProgress(progress: LoadProgress): void {
  latestLoadProgress = progress;
  loadProgressListeners.forEach((fn) => fn());
}

export function getLoadProgress(): LoadProgress | null {
  return latestLoadProgress;
}

export function subscribeToLoadProgress(listener: () => void): () => void {
  loadProgressListeners.add(listener);
  return () => {
    loadProgressListeners.delete(listener);
  };
}

const GITHUB_PULL_URL_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
/** GitHub rejects unified diffs above this file count. */
const GITHUB_MAX_AGGREGATE_DIFF_FILES = 300;
const pullRequestDiffCache = new Map<string, Promise<PullRequestDiffData>>();
const pullRequestDiffInFlight = new Map<string, Promise<PullRequestDiffData>>();
let cachedGitHubToken: string | null | undefined;
let githubTokenPromise: Promise<string | null> | null = null;

let latestRateLimitState: RateLimitState | null = null;
const rateLimitListeners = new Set<() => void>();

function updateRateLimitFromResponse(response: Response): void {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');
  if (remaining !== null && reset !== null) {
    latestRateLimitState = {
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };
    rateLimitListeners.forEach((fn) => fn());
  }
}

export function getRateLimitState(): RateLimitState | null {
  return latestRateLimitState;
}

export function subscribeToRateLimitChanges(listener: () => void): () => void {
  rateLimitListeners.add(listener);
  return () => {
    rateLimitListeners.delete(listener);
  };
}

export function isGitHubRateLimitError(error: unknown): boolean {
  if (typeof error === 'string' && error.includes('429')) {
    return true;
  }
  if (error instanceof Error && error.message.includes('429')) {
    return true;
  }
  return false;
}

export function warmGitHubTokenCache(): void {
  void getGitHubToken().catch(() => undefined);
}

export async function getGitHubToken(): Promise<string | null> {
  if (cachedGitHubToken !== undefined) {
    return cachedGitHubToken;
  }

  if (!githubTokenPromise) {
    githubTokenPromise = readGitHubTokenFromStorage().then((token) => {
      cachedGitHubToken = token;
      githubTokenPromise = null;
      return token;
    });
  }

  return githubTokenPromise;
}

async function readGitHubTokenFromStorage(): Promise<string | null> {
  if (!browser?.storage?.sync) {
    return null;
  }

  const stored = await browser.storage.sync.get('githubToken');
  return typeof stored.githubToken === 'string' && stored.githubToken.trim()
    ? stored.githubToken.trim()
    : null;
}

if (browser?.storage?.onChanged) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.githubToken) {
      cachedGitHubToken = undefined;
      githubTokenPromise = null;
    }
  });
}

export function parseGitHubPullRequestUrl(
  url: string | null | undefined,
): GitHubPullRequestRef | null {
  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }

  const match = url.match(GITHUB_PULL_URL_PATTERN);
  if (!match) {
    return null;
  }

  return {
    owner: decodeURIComponent(match[1]),
    repo: decodeURIComponent(match[2]),
    pullNumber: Number(match[3]),
    url,
  };
}

export function parseCurrentPullRequestUrl(): GitHubPullRequestRef | null {
  return parseGitHubPullRequestUrl(window.location.href);
}

export function prefetchPullRequestDiffData(url: string | null | undefined): void {
  const ref = parseGitHubPullRequestUrl(url);
  if (!ref) {
    return;
  }

  void fetchCachedPullRequestDiffData(ref).catch(() => undefined);
}

export function getPullRequestRefPrefix(ref: GitHubPullRequestRef): string {
  return `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.pullNumber}`;
}

export function getPullRequestContentCacheKey(ref: GitHubPullRequestRef, headSha: string): string {
  return `${getPullRequestRefPrefix(ref)}@${headSha}`;
}

export function invalidatePullRequestDiffCache(ref: GitHubPullRequestRef): void {
  const prefix = getPullRequestRefPrefix(ref);
  for (const key of pullRequestDiffCache.keys()) {
    if (key.startsWith(prefix)) {
      pullRequestDiffCache.delete(key);
    }
  }
}

export function fetchCachedPullRequestDiffData(
  ref: GitHubPullRequestRef,
): Promise<PullRequestDiffData> {
  const inFlightKey = getPullRequestRefPrefix(ref);
  const inFlight = pullRequestDiffInFlight.get(inFlightKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = fetchPullRequestDiffDataCached(ref).finally(() => {
    pullRequestDiffInFlight.delete(inFlightKey);
  });
  pullRequestDiffInFlight.set(inFlightKey, promise);
  return promise;
}

async function fetchPullRequestDiffDataCached(
  ref: GitHubPullRequestRef,
): Promise<PullRequestDiffData> {
  const token = await getGitHubToken();
  const headers = createGitHubHeaders(token);
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pulls/${ref.pullNumber}`;

  const pullRequest = await fetchJson<GitHubPullRequest>(apiBase, headers);
  const cacheKey = getPullRequestContentCacheKey(ref, pullRequest.head.sha);
  const cached = pullRequestDiffCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = fetchPullRequestDiffDataBody(ref, pullRequest, headers, apiBase).catch(
    (error: unknown) => {
      pullRequestDiffCache.delete(cacheKey);
      throw error;
    },
  );
  pullRequestDiffCache.set(cacheKey, promise);
  return promise;
}

async function fetchPullRequestDiffDataBody(
  ref: GitHubPullRequestRef,
  pullRequest: GitHubPullRequest,
  headers: Record<string, string>,
  apiBase: string,
): Promise<PullRequestDiffData> {
  const fileTotal = pullRequest.changed_files;

  updateLoadProgress({ phase: 'files', loaded: 0, total: fileTotal });

  const [files, reviewCommentsResult] = await Promise.all([
    fetchAllPullRequestFiles(`${apiBase}/files`, headers, (loaded) => {
      updateLoadProgress({ phase: 'files', loaded, total: fileTotal });
    }),
    fetchAllPullRequestReviewComments(`${apiBase}/comments`, headers),
  ]);

  updateLoadProgress({ phase: 'diff', loaded: 0, total: 1 });
  const patch = await fetchAggregatePullRequestPatch(ref, apiBase, headers, pullRequest, files);

  return {
    ref,
    pullRequest,
    files,
    patch,
    reviewComments: reviewCommentsResult.comments,
    reviewCommentsLoadError: reviewCommentsResult.loadError,
  };
}

async function fetchAggregatePullRequestPatch(
  ref: GitHubPullRequestRef,
  apiBase: string,
  headers: Record<string, string>,
  pullRequest: GitHubPullRequest,
  files: GitHubPullRequestFile[],
): Promise<string> {
  const fallback = () => buildPatchFromFiles(files);
  const diffHeaders = { ...headers, Accept: 'application/vnd.github.v3.diff' };

  if (pullRequest.changed_files > GITHUB_MAX_AGGREGATE_DIFF_FILES) {
    return (
      (await fetchFullPullRequestDiffWithFallbacks(ref, apiBase, diffHeaders, pullRequest)) ??
      fallback()
    );
  }

  try {
    return await fetchText(apiBase, diffHeaders);
  } catch (error) {
    if (!isGitHubDiffTooLargeError(error)) {
      throw error;
    }

    return (
      (await fetchFullPullRequestDiffWithFallbacks(ref, apiBase, diffHeaders, pullRequest)) ??
      fallback()
    );
  }
}

async function fetchFullPullRequestDiffWithFallbacks(
  ref: GitHubPullRequestRef,
  apiBase: string,
  diffHeaders: Record<string, string>,
  pullRequest: GitHubPullRequest,
): Promise<string | null> {
  const attempts = [
    () => fetchComparePullRequestDiff(ref, diffHeaders, pullRequest),
    () => fetchWebPullRequestDiff(ref),
    () => fetchText(apiBase, diffHeaders),
  ];

  for (const attempt of attempts) {
    try {
      const patch = await attempt();
      if (patch.trim()) {
        return patch;
      }
    } catch {
      // Try the next source.
    }
  }

  return null;
}

async function fetchComparePullRequestDiff(
  ref: GitHubPullRequestRef,
  headers: Record<string, string>,
  pullRequest: GitHubPullRequest,
): Promise<string> {
  const compareUrl = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/compare/${pullRequest.base.sha}...${pullRequest.head.sha}`;
  return fetchText(compareUrl, headers);
}

async function fetchWebPullRequestDiff(ref: GitHubPullRequestRef): Promise<string> {
  const url = `https://github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pull/${ref.pullNumber}.diff`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw await createGitHubError(response);
  }

  return response.text();
}

export function buildPatchFromFiles(files: GitHubPullRequestFile[]): string {
  return files
    .map((file) => {
      if (file.patch) {
        return wrapGitHubFilePatch(file);
      }

      return buildSyntheticRenamePatch(file) ?? '';
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n');
}

export function buildSyntheticRenamePatch(file: GitHubPullRequestFile): string | null {
  if (file.status !== 'renamed' && file.status !== 'copied') {
    return null;
  }

  const newPath = file.filename;
  const oldPath = file.previous_filename;
  if (!oldPath || oldPath === newPath || file.changes !== 0) {
    return null;
  }

  const action = file.status === 'copied' ? 'copy' : 'rename';
  return [
    `diff --git a/${oldPath} b/${newPath}`,
    'similarity index 100%',
    `${action} from ${oldPath}`,
    `${action} to ${newPath}`,
    '',
  ].join('\n');
}

export function wrapGitHubFilePatch(file: GitHubPullRequestFile): string {
  const newPath = file.filename;
  const oldPath = file.previous_filename ?? file.filename;

  let header: string;
  switch (file.status) {
    case 'added':
      header = `diff --git a/${newPath} b/${newPath}\nnew file mode 100644\n--- /dev/null\n+++ b/${newPath}\n`;
      break;
    case 'removed':
      header = `diff --git a/${oldPath} b/${oldPath}\ndeleted file mode 100644\n--- a/${oldPath}\n+++ /dev/null\n`;
      break;
    case 'renamed':
    case 'copied':
      header = `diff --git a/${oldPath} b/${newPath}\n--- a/${oldPath}\n+++ b/${newPath}\n`;
      break;
    default:
      header = `diff --git a/${oldPath} b/${newPath}\n--- a/${oldPath}\n+++ b/${newPath}\n`;
  }

  return `${header}${file.patch}`;
}

function isGitHubDiffTooLargeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('406') && error.message.includes('too_large');
}

function createGitHubHeaders(token: string | null): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchAllPullRequestFiles(
  url: string,
  headers: Record<string, string>,
  onProgress?: (loaded: number) => void,
): Promise<GitHubPullRequestFile[]> {
  return fetchAllPaginated<GitHubPullRequestFile>(url, headers, onProgress);
}

async function fetchAllPullRequestReviewComments(
  url: string,
  headers: Record<string, string>,
): Promise<ReviewCommentsFetchResult> {
  try {
    return {
      comments: await fetchAllPaginated<GitHubPullRequestReviewComment>(url, headers),
      loadError: null,
    };
  } catch (error: unknown) {
    // Review comments are optional; keep the diff usable when this endpoint fails.
    const message = error instanceof Error ? error.message : String(error);
    return {
      comments: [],
      loadError: message,
    };
  }
}

async function fetchAllPaginated<T>(
  url: string,
  headers: Record<string, string>,
  onProgress?: (loaded: number) => void,
): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = `${url}?per_page=100`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw await createGitHubError(response);
    }

    updateRateLimitFromResponse(response);
    items.push(...((await response.json()) as T[]));
    nextUrl = getNextLink(response.headers.get('Link'));
    onProgress?.(items.length);
  }

  return items;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw await createGitHubError(response);
  }

  updateRateLimitFromResponse(response);
  return (await response.json()) as T;
}

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw await createGitHubError(response);
  }

  updateRateLimitFromResponse(response);
  return response.text();
}

export function getNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  const nextPart = linkHeader.split(',').find((part) => part.includes('rel="next"'));
  const match = nextPart?.match(/<([^>]+)>/);
  return match?.[1] ?? null;
}

async function createGitHubError(response: Response): Promise<Error> {
  const body = await response.text().catch(() => '');
  const message = body
    ? `${response.status} ${response.statusText}: ${body}`
    : `${response.status} ${response.statusText}`;
  return new Error(`GitHub API request failed (${message})`);
}
