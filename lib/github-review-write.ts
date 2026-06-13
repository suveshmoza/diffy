import type { SelectedLineRange, SelectionSide } from '@pierre/diffs';

import {
  getGitHubToken,
  type GitHubPullRequestRef,
  type GitHubPullRequestReviewComment,
} from './github';

export type GitHubViewer = {
  login: string;
  avatar_url?: string;
};

export type GitHubReviewWriteErrorCode =
  | 'missing_token'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'rate_limit'
  | 'unknown';

export class GitHubReviewWriteError extends Error {
  readonly code: GitHubReviewWriteErrorCode;

  constructor(message: string, code: GitHubReviewWriteErrorCode) {
    super(message);
    this.name = 'GitHubReviewWriteError';
    this.code = code;
  }
}

type CreateReviewCommentInput = {
  body: string;
  commitId: string;
  path: string;
  range: SelectedLineRange;
};

function createGitHubHeaders(token: string | null): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function pullRequestApiBase(ref: GitHubPullRequestRef): string {
  return `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pulls/${ref.pullNumber}`;
}

async function requireToken(): Promise<string> {
  const token = await getGitHubToken();
  if (!token) {
    throw new GitHubReviewWriteError(
      'Add a GitHub token in the diffy extension popup to post comments.',
      'missing_token',
    );
  }

  return token;
}

function toGitHubReviewWriteError(error: unknown): GitHubReviewWriteError {
  if (error instanceof GitHubReviewWriteError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('401')) {
    return new GitHubReviewWriteError(
      'GitHub rejected the token (401). Check your token.',
      'unauthorized',
    );
  }

  if (message.includes('403')) {
    return new GitHubReviewWriteError(
      'You do not have permission to comment on this pull request (403).',
      'forbidden',
    );
  }

  if (message.includes('422')) {
    return new GitHubReviewWriteError(
      'GitHub could not place this comment on the selected lines (422).',
      'validation',
    );
  }

  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return new GitHubReviewWriteError(
      'GitHub rate limit reached. Try again shortly.',
      'rate_limit',
    );
  }

  return new GitHubReviewWriteError(message, 'unknown');
}

async function postJson<T>(url: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: createGitHubHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = detail
      ? `${response.status} ${response.statusText}: ${detail}`
      : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function patchJson<T>(url: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: createGitHubHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = detail
      ? `${response.status} ${response.statusText}: ${detail}`
      : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function deleteRequest(url: string, token: string): Promise<void> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: createGitHubHeaders(token),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = detail
      ? `${response.status} ${response.statusText}: ${detail}`
      : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: createGitHubHeaders(token) });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = detail
      ? `${response.status} ${response.statusText}: ${detail}`
      : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function toGitHubSide(side?: SelectionSide): 'LEFT' | 'RIGHT' {
  return side === 'deletions' ? 'LEFT' : 'RIGHT';
}

export function selectedRangeToCommentPayload(
  input: CreateReviewCommentInput,
): Record<string, unknown> {
  const endSide = toGitHubSide(input.range.endSide ?? input.range.side);
  const startSide = toGitHubSide(input.range.side);
  const isMultiLine = input.range.start !== input.range.end;

  const payload: Record<string, unknown> = {
    body: input.body,
    commit_id: input.commitId,
    path: input.path,
    line: input.range.end,
    side: endSide,
  };

  if (isMultiLine) {
    payload.start_line = input.range.start;
    payload.start_side = startSide;
  }

  return payload;
}

export async function fetchGitHubViewer(): Promise<GitHubViewer | null> {
  const token = await getGitHubToken();
  if (!token) {
    return null;
  }

  try {
    return await fetchJson<GitHubViewer>('https://api.github.com/user', token);
  } catch {
    return null;
  }
}

export async function createImmediateReviewComment(
  ref: GitHubPullRequestRef,
  input: CreateReviewCommentInput,
): Promise<GitHubPullRequestReviewComment> {
  try {
    const token = await requireToken();
    return await postJson<GitHubPullRequestReviewComment>(
      `${pullRequestApiBase(ref)}/comments`,
      token,
      selectedRangeToCommentPayload(input),
    );
  } catch (error: unknown) {
    throw toGitHubReviewWriteError(error);
  }
}

export async function createReviewCommentReply(
  ref: GitHubPullRequestRef,
  input: { body: string; inReplyToId: number },
): Promise<GitHubPullRequestReviewComment> {
  try {
    const token = await requireToken();
    return await postJson<GitHubPullRequestReviewComment>(
      `${pullRequestApiBase(ref)}/comments`,
      token,
      {
        body: input.body,
        in_reply_to: input.inReplyToId,
      },
    );
  } catch (error: unknown) {
    throw toGitHubReviewWriteError(error);
  }
}

export async function updateReviewComment(
  ref: GitHubPullRequestRef,
  commentId: number,
  body: string,
): Promise<GitHubPullRequestReviewComment> {
  try {
    const token = await requireToken();
    return await patchJson<GitHubPullRequestReviewComment>(
      `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pulls/comments/${commentId}`,
      token,
      { body },
    );
  } catch (error: unknown) {
    throw toGitHubReviewWriteError(error);
  }
}

export async function deleteReviewComment(
  ref: GitHubPullRequestRef,
  commentId: number,
): Promise<void> {
  try {
    const token = await requireToken();
    await deleteRequest(
      `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/pulls/comments/${commentId}`,
      token,
    );
  } catch (error: unknown) {
    throw toGitHubReviewWriteError(error);
  }
}
