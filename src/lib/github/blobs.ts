import { mimeTypeForImagePath } from '@/lib/diff/media-files';
import { getGitHubToken, type GitHubPullRequestRef } from '@/lib/github/api';
import { githubFetch } from '@/lib/github/github-fetch';
import { updateRateLimitFromResponse } from '@/lib/github/octokit';

/** Soft cap to avoid loading huge assets into the overlay. */
export const MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024;

export type RepoFileBytes = {
  bytes: Uint8Array;
  mimeType: string;
  size: number;
  path: string;
  sha: string;
};

export class MediaFileFetchError extends Error {
  readonly status: number | null;

  constructor(message: string, options?: { status?: number | null; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'MediaFileFetchError';
    this.status = options?.status ?? null;
  }
}

/**
 * Fetch raw file bytes at a commit via the Contents API (works for private repos with PAT).
 */
export async function fetchRepoFileBytes(
  ref: GitHubPullRequestRef,
  path: string,
  commitSha: string,
): Promise<RepoFileBytes> {
  const token = await getGitHubToken();
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const url = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(commitSha)}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.raw',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await githubFetch(url, { headers });
  } catch (error: unknown) {
    throw new MediaFileFetchError(
      error instanceof Error ? error.message : `Failed to load ${path}`,
      {
        cause: error,
      },
    );
  }

  updateRateLimitFromResponse(response);

  if (!response.ok) {
    if (response.status === 404) {
      throw new MediaFileFetchError(`File not found at this revision: ${path}`, { status: 404 });
    }
    throw new MediaFileFetchError(`Failed to load ${path} (${response.status})`, {
      status: response.status,
    });
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_MEDIA_FILE_BYTES) {
    throw new MediaFileFetchError(
      `File is too large to preview (${formatBytes(buffer.byteLength)}; limit ${formatBytes(MAX_MEDIA_FILE_BYTES)}).`,
    );
  }

  return {
    bytes: new Uint8Array(buffer),
    mimeType: mimeTypeForImagePath(path),
    size: buffer.byteLength,
    path,
    sha: commitSha,
  };
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildGitHubBlobUrl(
  owner: string,
  repo: string,
  commitSha: string,
  path: string,
): string {
  return `https://github.com/${owner}/${repo}/blob/${commitSha}/${path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}
