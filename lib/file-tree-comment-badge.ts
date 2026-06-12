/** Matches singular and plural review-comment decoration titles. */
export const FILE_TREE_REVIEW_COMMENT_TITLE_MARKER = ' review comment';

export function formatReviewCommentDecorationTitle(
  changeTitle: string,
  reviewCommentCount: number,
): string {
  const formattedCount = reviewCommentCount.toLocaleString();
  const commentLabel = reviewCommentCount === 1 ? 'review comment' : 'review comments';
  return `${changeTitle} · ${formattedCount} ${commentLabel}`;
}

export function reviewCommentDecorationTitleSuffix(reviewCommentCount: number): string {
  const formattedCount = reviewCommentCount.toLocaleString();
  const commentLabel = reviewCommentCount === 1 ? 'review comment' : 'review comments';
  return `· ${formattedCount} ${commentLabel}`;
}

export function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildCommentBadgeCountCss(
  reviewCommentCountByPath: ReadonlyMap<string, number> | undefined,
): string {
  if (!reviewCommentCountByPath || reviewCommentCountByPath.size === 0) {
    return '';
  }

  const counts = new Map<number, string>();
  for (const count of reviewCommentCountByPath.values()) {
    if (count > 0) {
      counts.set(count, count.toLocaleString());
    }
  }

  return [...counts.entries()]
    .map(([count, formattedCount]) => {
      const titleSuffix = escapeCssString(reviewCommentDecorationTitleSuffix(count));
      const escapedCount = escapeCssString(formattedCount);
      return `[data-item-section="decoration"] > span[title$="${titleSuffix}"]::after { content: "${escapedCount}"; }`;
    })
    .join('\n');
}
