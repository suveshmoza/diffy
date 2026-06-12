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
  user?: { login: string };
  base: { ref: string; sha: string; repo: { full_name: string } };
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  additions: number;
  deletions: number;
  changed_files: number;
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

const GITHUB_PULL_URL_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
/** GitHub rejects unified diffs above this file count. */
const GITHUB_MAX_AGGREGATE_DIFF_FILES = 300;
const pullRequestDiffCache = new Map<string, Promise<PullRequestDiffData>>();

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

export async function getGitHubToken(): Promise<string | null> {
  if (!browser?.storage?.sync) {
    return null;
  }

  const stored = await browser.storage.sync.get('githubToken');
  return typeof stored.githubToken === 'string' && stored.githubToken.trim()
    ? stored.githubToken.trim()
    : null;
}

export function prefetchPullRequestDiffData(url: string | null | undefined): void {
  const ref = parseGitHubPullRequestUrl(url);
  if (!ref) {
    return;
  }

  void fetchCachedPullRequestDiffData(ref).catch(() => undefined);
}

export function invalidatePullRequestDiffCache(ref: GitHubPullRequestRef): void {
  pullRequestDiffCache.delete(getPullRequestDiffCacheKey(ref));
}

export function fetchCachedPullRequestDiffData(
  ref: GitHubPullRequestRef,
): Promise<PullRequestDiffData> {
  const cacheKey = getPullRequestDiffCacheKey(ref);
  const cached = pullRequestDiffCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = fetchPullRequestDiffData(ref).catch((error: unknown) => {
    pullRequestDiffCache.delete(cacheKey);
    throw error;
  });
  pullRequestDiffCache.set(cacheKey, promise);
  return promise;
}

async function fetchPullRequestDiffData(ref: GitHubPullRequestRef): Promise<PullRequestDiffData> {
  const token = await getGitHubToken();
  const headers = createGitHubHeaders(token);
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pulls/${ref.pullNumber}`;

  const [pullRequest, files, reviewCommentsResult] = await Promise.all([
    fetchJson<GitHubPullRequest>(apiBase, headers),
    fetchAllPullRequestFiles(`${apiBase}/files`, headers),
    fetchAllPullRequestReviewComments(`${apiBase}/comments`, headers),
  ]);

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

function buildSyntheticRenamePatch(file: GitHubPullRequestFile): string | null {
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

function wrapGitHubFilePatch(file: GitHubPullRequestFile): string {
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

function getPullRequestDiffCacheKey(ref: GitHubPullRequestRef): string {
  return `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.pullNumber}`;
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
): Promise<GitHubPullRequestFile[]> {
  return fetchAllPaginated<GitHubPullRequestFile>(url, headers);
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

async function fetchAllPaginated<T>(url: string, headers: Record<string, string>): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = `${url}?per_page=100`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw await createGitHubError(response);
    }

    items.push(...((await response.json()) as T[]));
    nextUrl = getNextLink(response.headers.get('Link'));
  }

  return items;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw await createGitHubError(response);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw await createGitHubError(response);
  }

  return response.text();
}

function getNextLink(linkHeader: string | null): string | null {
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
