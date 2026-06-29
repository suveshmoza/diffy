import { RequestError } from '@octokit/request-error';
import type { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';

import { githubFetch } from './github-fetch';
import { addRateLimitListener, getOctokitClient, resetOctokitClients } from './octokit';
import { readGitHubToken, subscribeToGitHubTokenChanges } from './token-storage';

export type GitHubPullRequestRef = {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
};

export type GitHubPullRequest = RestEndpointMethodTypes['pulls']['get']['response']['data'];

export type GitHubPullRequestReviewComment =
  RestEndpointMethodTypes['pulls']['listReviewComments']['response']['data'][number] & {
    is_minimized?: boolean;
    hidden?: boolean;
    minimized_reason?: string | null;
  };

type ReviewCommentsFetchResult = {
  comments: GitHubPullRequestReviewComment[];
  loadError: string | null;
};

export type GitHubPullRequestFile =
  RestEndpointMethodTypes['pulls']['listFiles']['response']['data'][number];

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
let cachedGitHubToken: string | null | undefined;
let githubTokenPromise: Promise<string | null> | null = null;

let latestRateLimitState: RateLimitState | null = null;
const rateLimitListeners = new Set<() => void>();

addRateLimitListener((state) => {
  latestRateLimitState = state;
  rateLimitListeners.forEach((fn) => fn());
});

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
  if (error instanceof RequestError) {
    return error.status === 429;
  }

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
    githubTokenPromise = readGitHubToken().then((token) => {
      cachedGitHubToken = token;
      githubTokenPromise = null;
      return token;
    });
  }

  return githubTokenPromise;
}

subscribeToGitHubTokenChanges(() => {
  cachedGitHubToken = undefined;
  githubTokenPromise = null;
  resetOctokitClients();
});

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

export function getPullRequestRefPrefix(ref: GitHubPullRequestRef): string {
  return `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.pullNumber}`;
}

export function getPullRequestContentCacheKey(ref: GitHubPullRequestRef, headSha: string): string {
  return `${getPullRequestRefPrefix(ref)}@${headSha}`;
}

export type PullRequestHeadMeta = {
  sha: string;
  title: string;
};

export async function fetchPullRequestHeadMeta(
  ref: GitHubPullRequestRef,
): Promise<PullRequestHeadMeta> {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.pulls.get(pullParams(ref));
  return { sha: data.head.sha, title: data.title };
}

export async function fetchPullRequestDiffData(
  ref: GitHubPullRequestRef,
): Promise<PullRequestDiffData> {
  const octokit = await getOctokit();
  const { data: pullRequest } = await octokit.rest.pulls.get(pullParams(ref));
  return fetchPullRequestDiffDataBody(ref, pullRequest, octokit);
}

async function getOctokit(): Promise<Octokit> {
  const token = await getGitHubToken();
  return getOctokitClient(token ?? undefined);
}

function pullParams(ref: GitHubPullRequestRef) {
  return {
    owner: ref.owner,
    repo: ref.repo,
    pull_number: ref.pullNumber,
  };
}

async function fetchPullRequestDiffDataBody(
  ref: GitHubPullRequestRef,
  pullRequest: GitHubPullRequest,
  octokit: Octokit,
): Promise<PullRequestDiffData> {
  const fileTotal = pullRequest.changed_files;
  const params = { ...pullParams(ref), per_page: 100 };

  updateLoadProgress({ phase: 'files', loaded: 0, total: fileTotal });

  const [files, reviewCommentsResult] = await Promise.all([
    paginatePullFiles(octokit, params, (loaded) => {
      updateLoadProgress({ phase: 'files', loaded, total: fileTotal });
    }),
    fetchAllPullRequestReviewComments(octokit, params),
  ]);

  updateLoadProgress({ phase: 'diff', loaded: 0, total: 1 });
  const patch = await fetchAggregatePullRequestPatch(ref, octokit, pullRequest, files);

  return {
    ref,
    pullRequest,
    files,
    patch,
    reviewComments: reviewCommentsResult.comments,
    reviewCommentsLoadError: reviewCommentsResult.loadError,
  };
}

async function paginatePullFiles(
  octokit: Octokit,
  params: { owner: string; repo: string; pull_number: number; per_page: number },
  onProgress?: (loaded: number) => void,
): Promise<GitHubPullRequestFile[]> {
  const files: GitHubPullRequestFile[] = [];

  for await (const response of octokit.paginate.iterator(octokit.rest.pulls.listFiles, params)) {
    files.push(...response.data);
    onProgress?.(files.length);
  }

  return files;
}

async function paginateReviewComments(
  octokit: Octokit,
  params: { owner: string; repo: string; pull_number: number; per_page: number },
): Promise<GitHubPullRequestReviewComment[]> {
  const comments: GitHubPullRequestReviewComment[] = [];

  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.listReviewComments,
    params,
  )) {
    comments.push(...response.data);
  }

  return comments;
}

/** Re-fetch all review comments for a PR (e.g. after publishing a batched review). */
export async function fetchPullRequestReviewComments(
  ref: GitHubPullRequestRef,
): Promise<GitHubPullRequestReviewComment[]> {
  const octokit = await getOctokit();
  return paginateReviewComments(octokit, { ...pullParams(ref), per_page: 100 });
}

async function fetchAllPullRequestReviewComments(
  octokit: Octokit,
  params: { owner: string; repo: string; pull_number: number; per_page: number },
): Promise<ReviewCommentsFetchResult> {
  try {
    return {
      comments: await paginateReviewComments(octokit, params),
      loadError: null,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      comments: [],
      loadError: message,
    };
  }
}

async function fetchAggregatePullRequestPatch(
  ref: GitHubPullRequestRef,
  octokit: Octokit,
  pullRequest: GitHubPullRequest,
  files: GitHubPullRequestFile[],
): Promise<string> {
  const fallback = () => buildPatchFromFiles(files);
  const diffParams = {
    ...pullParams(ref),
    mediaType: { format: 'diff' as const },
  };

  if (pullRequest.changed_files > GITHUB_MAX_AGGREGATE_DIFF_FILES) {
    return (
      (await fetchFullPullRequestDiffWithFallbacks(ref, octokit, diffParams, pullRequest)) ??
      fallback()
    );
  }

  try {
    return await fetchPullRequestDiff(octokit, diffParams);
  } catch (error) {
    if (!isGitHubDiffTooLargeError(error)) {
      throw error;
    }

    return (
      (await fetchFullPullRequestDiffWithFallbacks(ref, octokit, diffParams, pullRequest)) ??
      fallback()
    );
  }
}

async function fetchPullRequestDiff(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    pull_number: number;
    mediaType: { format: 'diff' };
  },
): Promise<string> {
  const { data } = await octokit.rest.pulls.get(params);
  return data as unknown as string;
}

async function fetchFullPullRequestDiffWithFallbacks(
  ref: GitHubPullRequestRef,
  octokit: Octokit,
  diffParams: {
    owner: string;
    repo: string;
    pull_number: number;
    mediaType: { format: 'diff' };
  },
  pullRequest: GitHubPullRequest,
): Promise<string | null> {
  const attempts = [
    () => fetchComparePullRequestDiff(ref, octokit, pullRequest),
    () => fetchWebPullRequestDiff(ref),
    () => fetchPullRequestDiff(octokit, diffParams),
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
  octokit: Octokit,
  pullRequest: GitHubPullRequest,
): Promise<string> {
  const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
    owner: ref.owner,
    repo: ref.repo,
    basehead: `${pullRequest.base.sha}...${pullRequest.head.sha}`,
    mediaType: { format: 'diff' },
  });
  return data as unknown as string;
}

async function fetchWebPullRequestDiff(ref: GitHubPullRequestRef): Promise<string> {
  const url = `https://github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pull/${ref.pullNumber}.diff`;
  const response = await githubFetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw await createFetchError(response);
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
  if (error instanceof RequestError) {
    if (error.status !== 406) {
      return false;
    }

    const body =
      typeof error.response?.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response?.data ?? '');
    return body.includes('too_large');
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('406') && error.message.includes('too_large');
}

async function createFetchError(response: Response): Promise<Error> {
  const body = await response.text().catch(() => '');
  const message = body
    ? `${response.status} ${response.statusText}: ${body}`
    : `${response.status} ${response.statusText}`;
  return new Error(`GitHub API request failed (${message})`);
}
