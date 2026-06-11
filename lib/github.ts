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
  base: { ref: string; repo: { full_name: string } };
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  additions: number;
  deletions: number;
  changed_files: number;
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
};

const GITHUB_PULL_URL_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
/** GitHub rejects unified diffs above this file count. */
const GITHUB_MAX_AGGREGATE_DIFF_FILES = 300;
const pullRequestDiffCache = new Map<string, Promise<PullRequestDiffData>>();

export function parseGitHubPullRequestUrl(url: string | null | undefined): GitHubPullRequestRef | null {
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

export function fetchCachedPullRequestDiffData(ref: GitHubPullRequestRef): Promise<PullRequestDiffData> {
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

  const [pullRequest, files] = await Promise.all([
    fetchJson<GitHubPullRequest>(apiBase, headers),
    fetchAllPullRequestFiles(`${apiBase}/files`, headers),
  ]);

  const patch = await fetchAggregatePullRequestPatch(apiBase, headers, pullRequest, files);

  return { ref, pullRequest, files, patch };
}

async function fetchAggregatePullRequestPatch(
  apiBase: string,
  headers: Record<string, string>,
  pullRequest: GitHubPullRequest,
  files: GitHubPullRequestFile[],
): Promise<string> {
  if (pullRequest.changed_files > GITHUB_MAX_AGGREGATE_DIFF_FILES) {
    return buildPatchFromFiles(files);
  }

  try {
    return await fetchText(apiBase, {
      ...headers,
      Accept: 'application/vnd.github.v3.diff',
    });
  } catch (error) {
    if (!isGitHubDiffTooLargeError(error)) {
      throw error;
    }

    return buildPatchFromFiles(files);
  }
}

export function buildPatchFromFiles(files: GitHubPullRequestFile[]): string {
  return files
    .filter((file) => file.patch)
    .map((file) => wrapGitHubFilePatch(file))
    .join('\n');
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

async function fetchAllPullRequestFiles(url: string, headers: Record<string, string>): Promise<GitHubPullRequestFile[]> {
  const files: GitHubPullRequestFile[] = [];
  let nextUrl: string | null = `${url}?per_page=100`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw await createGitHubError(response);
    }

    files.push(...((await response.json()) as GitHubPullRequestFile[]));
    nextUrl = getNextLink(response.headers.get('Link'));
  }

  return files;
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
  const message = body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`;
  return new Error(`GitHub API request failed (${message})`);
}
