import type { GitHubPullRequestRef } from '@/domains/github/api';
import { renderGitHubCommentBody } from '@/domains/github/comments/markdown';
import { cn } from '@/shared/utils';

type ReviewCommentBodyProps = {
  body: string;
  pullRequestRef?: GitHubPullRequestRef;
  filePath?: string;
  emptyMessage?: string;
  className?: string;
};

export function ReviewCommentBody({
  body,
  pullRequestRef,
  filePath,
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
      {renderGitHubCommentBody(body, { pullRequestRef, filePath })}
    </div>
  );
}
