import type { GitHubPullRequestReviewComment } from '@/lib/github/api';

export function formatQuoteReplyPrefill(comment: GitHubPullRequestReviewComment): string {
  const quotedBody = comment.body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  return `${quotedBody}\n\n `;
}
