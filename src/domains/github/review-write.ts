import { RequestError } from '@octokit/request-error';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import type { SelectedLineRange, SelectionSide } from '@pierre/diffs';

import {
  getGitHubToken,
  type GitHubPullRequestRef,
  type GitHubPullRequestReviewComment,
} from './api';
import { getOctokitClient } from './octokit';

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

type ReviewCommentBody = {
  body: string;
  commit_id: string;
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  start_line?: number;
  start_side?: 'LEFT' | 'RIGHT';
};

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

const GENERIC_GITHUB_ERROR_MESSAGES = new Set([
  'bad credentials',
  'forbidden',
  'not found',
  'unprocessable entity',
  'validation failed',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractGitHubErrorMessage(data: unknown): string | null {
  if (!isRecord(data)) {
    return null;
  }

  const errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const messages = errors
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }

        if (isRecord(entry) && typeof entry.message === 'string') {
          return entry.message.trim();
        }

        return null;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  if (typeof data.message === 'string') {
    const message = data.message.trim();
    if (message && !GENERIC_GITHUB_ERROR_MESSAGES.has(message.toLowerCase())) {
      return message;
    }
  }

  return null;
}

function resolveRequestErrorMessage(error: RequestError, fallback: string): string {
  return extractGitHubErrorMessage(error.response?.data) ?? fallback;
}

function toGitHubReviewWriteError(error: unknown): GitHubReviewWriteError {
  if (error instanceof GitHubReviewWriteError) {
    return error;
  }

  if (error instanceof RequestError) {
    switch (error.status) {
      case 401:
        return new GitHubReviewWriteError(
          resolveRequestErrorMessage(error, 'GitHub rejected the token (401). Check your token.'),
          'unauthorized',
        );
      case 403:
        return new GitHubReviewWriteError(
          resolveRequestErrorMessage(
            error,
            'You do not have permission to comment on this pull request (403).',
          ),
          'forbidden',
        );
      case 422:
        return new GitHubReviewWriteError(
          resolveRequestErrorMessage(error, 'GitHub rejected this request (422).'),
          'validation',
        );
      case 429:
        return new GitHubReviewWriteError(
          resolveRequestErrorMessage(error, 'GitHub rate limit reached. Try again shortly.'),
          'rate_limit',
        );
      default:
        return new GitHubReviewWriteError(error.message, 'unknown');
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes('rate limit')) {
    return new GitHubReviewWriteError(
      'GitHub rate limit reached. Try again shortly.',
      'rate_limit',
    );
  }

  return new GitHubReviewWriteError(message, 'unknown');
}

export function toGitHubSide(side?: SelectionSide): 'LEFT' | 'RIGHT' {
  return side === 'deletions' ? 'LEFT' : 'RIGHT';
}

export function selectedRangeToCommentPayload(input: CreateReviewCommentInput): ReviewCommentBody {
  const endSide = toGitHubSide(input.range.endSide ?? input.range.side);
  const startSide = toGitHubSide(input.range.side);
  const isMultiLine = input.range.start !== input.range.end;

  const payload: ReviewCommentBody = {
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

type BatchReviewCommentEntry = NonNullable<
  RestEndpointMethodTypes['pulls']['createReview']['parameters']['comments']
>[number];

/** Build a single entry for the `comments[]` array of a batched review (no commit_id per comment). */
export function rangeToReviewComment(
  path: string,
  range: SelectedLineRange,
  body: string,
): BatchReviewCommentEntry {
  const endSide = toGitHubSide(range.endSide ?? range.side);
  const startSide = toGitHubSide(range.side);
  const isMultiLine = range.start !== range.end;

  const payload: BatchReviewCommentEntry = {
    path,
    body,
    line: range.end,
    side: endSide,
  };

  if (isMultiLine) {
    payload.start_line = range.start;
    payload.start_side = startSide;
  }

  return payload;
}

export type ReviewEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

export type BatchedReviewComment = {
  path: string;
  range: SelectedLineRange;
  body: string;
};

export type PublishBatchedReviewInput = {
  commitId: string;
  event: ReviewEvent;
  body: string;
  comments: BatchedReviewComment[];
};

export type GitHubPullRequestReview =
  RestEndpointMethodTypes['pulls']['createReview']['response']['data'];

/** Publish all queued inline comments + a verdict in a single `POST /reviews` request. */
export async function publishBatchedReview(
  ref: GitHubPullRequestRef,
  input: PublishBatchedReviewInput,
): Promise<GitHubPullRequestReview> {
  try {
    const token = await requireToken();
    const body = input.body.trim();
    const { data } = await getOctokitClient(token).rest.pulls.createReview({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.pullNumber,
      commit_id: input.commitId,
      event: input.event,
      ...(body ? { body } : {}),
      comments: input.comments.map((comment) =>
        rangeToReviewComment(comment.path, comment.range, comment.body),
      ),
    });
    return data;
  } catch (error: unknown) {
    throw toGitHubReviewWriteError(error);
  }
}

export async function fetchGitHubViewer(): Promise<GitHubViewer | null> {
  const token = await getGitHubToken();
  if (!token) {
    return null;
  }

  try {
    const { data } = await getOctokitClient(token).rest.users.getAuthenticated();
    return { login: data.login, avatar_url: data.avatar_url ?? undefined };
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
    const { data } = await getOctokitClient(token).rest.pulls.createReviewComment({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.pullNumber,
      ...selectedRangeToCommentPayload(input),
    });
    return data;
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
    const { data } = await getOctokitClient(token).rest.pulls.createReplyForReviewComment({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.pullNumber,
      comment_id: input.inReplyToId,
      body: input.body,
    });
    return data;
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
    const { data } = await getOctokitClient(token).rest.pulls.updateReviewComment({
      owner: ref.owner,
      repo: ref.repo,
      comment_id: commentId,
      body,
    });
    return data;
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
    await getOctokitClient(token).rest.pulls.deleteReviewComment({
      owner: ref.owner,
      repo: ref.repo,
      comment_id: commentId,
    });
  } catch (error: unknown) {
    throw toGitHubReviewWriteError(error);
  }
}
