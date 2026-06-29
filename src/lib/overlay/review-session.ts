import type { SelectedLineRange } from '@pierre/diffs';

import { getPullRequestRefPrefix, type GitHubPullRequestRef } from '@/lib/github/api';
import type { QueuedComment } from '@/lib/review/comment-queue';

export type PersistedReviewDraft = {
  itemId: string;
  path: string;
  draftId: string;
  range: SelectedLineRange;
  body: string;
};

type ReviewSession = {
  queue: QueuedComment[];
  isBatchMode: boolean;
  drafts: PersistedReviewDraft[];
};

const sessions = new Map<string, ReviewSession>();

function sessionKey(ref: GitHubPullRequestRef): string {
  return getPullRequestRefPrefix(ref);
}

function emptySession(): ReviewSession {
  return { queue: [], isBatchMode: false, drafts: [] };
}

function getOrCreateSession(ref: GitHubPullRequestRef): ReviewSession {
  const key = sessionKey(ref);
  const existing = sessions.get(key);
  if (existing) {
    return existing;
  }

  const session = emptySession();
  sessions.set(key, session);
  return session;
}

function persistSession(ref: GitHubPullRequestRef, session: ReviewSession): void {
  const key = sessionKey(ref);
  if (session.queue.length === 0 && session.drafts.length === 0 && !session.isBatchMode) {
    sessions.delete(key);
    return;
  }

  sessions.set(key, session);
}

export function getReviewSession(ref: GitHubPullRequestRef): ReviewSession {
  return sessions.get(sessionKey(ref)) ?? emptySession();
}

export function getReviewDraftBody(ref: GitHubPullRequestRef, draftId: string): string {
  return getReviewSession(ref).drafts.find((draft) => draft.draftId === draftId)?.body ?? '';
}

export function syncReviewQueue(
  ref: GitHubPullRequestRef,
  queue: QueuedComment[],
  isBatchMode: boolean,
): void {
  const session = getOrCreateSession(ref);
  persistSession(ref, { ...session, queue, isBatchMode });
}

export function upsertReviewDraft(ref: GitHubPullRequestRef, draft: PersistedReviewDraft): void {
  const session = getOrCreateSession(ref);
  const drafts = session.drafts.filter((entry) => entry.draftId !== draft.draftId);
  drafts.push(draft);
  persistSession(ref, { ...session, drafts });
}

export function updateReviewDraftBody(
  ref: GitHubPullRequestRef,
  draftId: string,
  body: string,
): void {
  const session = getOrCreateSession(ref);
  const drafts = session.drafts.map((draft) =>
    draft.draftId === draftId ? { ...draft, body } : draft,
  );
  persistSession(ref, { ...session, drafts });
}

export function removeReviewDraft(ref: GitHubPullRequestRef, draftId: string): void {
  const session = getOrCreateSession(ref);
  const drafts = session.drafts.filter((draft) => draft.draftId !== draftId);
  persistSession(ref, { ...session, drafts });
}

export function clearReviewSession(ref: GitHubPullRequestRef): void {
  sessions.delete(sessionKey(ref));
}

export function clearAllReviewSessions(): void {
  sessions.clear();
}
