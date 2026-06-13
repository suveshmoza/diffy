import { COMMENT_ICON_MASK_STYLE } from '@/lib/file-tree-comment-icon';

export function CommentIcon() {
  return (
    <span
      aria-hidden='true'
      style={COMMENT_ICON_MASK_STYLE}
    />
  );
}
