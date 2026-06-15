import type { GitHubPullRequestRef } from '@/lib/github/api';

const FENCED_BLOCK_PATTERN = /(```[\s\S]*?```)/g;
const INLINE_CODE_PATTERN = /(`[^`\n]+`)/g;
const MENTION_PATTERN = /(?<![[`\w])@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?)/g;
const ISSUE_PATTERN = /(?<![[`\w])#(\d+)\b/g;

/** Inject markdown links for @mentions and #issue refs outside fenced and inline code. */
export function preprocessGithubCommentAutolinks(
  body: string,
  pullRequestRef?: GitHubPullRequestRef,
): string {
  return body
    .split(FENCED_BLOCK_PATTERN)
    .map((segment) => {
      if (segment.startsWith('```')) {
        return segment;
      }

      return segment
        .split(INLINE_CODE_PATTERN)
        .map((part) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return part;
          }

          return applyAutolinks(part, pullRequestRef);
        })
        .join('');
    })
    .join('');
}

function applyAutolinks(text: string, pullRequestRef?: GitHubPullRequestRef): string {
  const withMentions = text.replace(
    MENTION_PATTERN,
    (_match, username: string) => `[@${username}](https://github.com/${username})`,
  );

  if (!pullRequestRef) {
    return withMentions;
  }

  const { owner, repo } = pullRequestRef;
  const issueBase = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;

  return withMentions.replace(ISSUE_PATTERN, (_match, issueNumber: string) => {
    return `[#${issueNumber}](${issueBase}/${issueNumber})`;
  });
}
