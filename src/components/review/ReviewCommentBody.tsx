import type { GitHubPullRequestRef } from '@/lib/github/api';
import { renderGitHubCommentBody } from '@/lib/github/comments/markdown';
import { cn } from '@/lib/utils';

type ReviewCommentBodyProps = {
  body: string;
  pullRequestRef?: GitHubPullRequestRef;
  emptyMessage?: string;
  className?: string;
};

export function ReviewCommentBody({
  body,
  pullRequestRef,
  emptyMessage = 'Nothing to preview',
  className,
}: ReviewCommentBodyProps) {
  const trimmed = body.trim();

  if (!trimmed) {
    return (
      <p
        className={cn(
          'mt-1 min-w-0 text-sm leading-relaxed text-muted-foreground italic',
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn('mt-1 min-w-0 text-sm leading-relaxed text-foreground', className)}>
      {renderGitHubCommentBody(body, { pullRequestRef })}
    </div>
  );
}
