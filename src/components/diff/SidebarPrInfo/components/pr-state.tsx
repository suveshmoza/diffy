import type { GitHubPullRequest } from '@/lib/github/api';

export const PR_STATE = {
  merged: {
    label: 'Merged',
    className: 'border-purple-500/30 bg-purple-500/15 text-purple-400',
  },
  open: {
    label: 'Open',
    className: 'border-green-500/30 bg-green-500/15 text-green-500',
  },
  closed: {
    label: 'Closed',
    className: 'border-destructive/30 bg-destructive/15 text-destructive',
  },
} as const;

export type PrState = keyof typeof PR_STATE;

export function getPrState(pullRequest: GitHubPullRequest): PrState {
  if (pullRequest.state === 'closed' && pullRequest.merged_at != null) return 'merged';
  return pullRequest.state === 'open' ? 'open' : 'closed';
}
