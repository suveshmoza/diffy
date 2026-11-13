const COMMENT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="black"><path d="M8 1.5a6.5 6.5 0 0 0-4.596 11.096.75.75 0 0 1 0 1.06l-.843.844H8a6.5 6.5 0 1 0 0-13M0 8a8 8 0 1 1 8 8H.75a.75.75 0 0 1-.53-1.28l1.618-1.618A7.97 7.97 0 0 1 0 8"/></svg>`;

export const FILE_TREE_COMMENT_ICON_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(
  COMMENT_ICON_SVG,
)}")`;

export const FILE_TREE_COMMENT_ICON_SIZE = '14px';

export const FILE_TREE_REVIEW_COMMENT_TITLE_MARKER = ' review comment';

export const FILE_TREE_COMMENT_BADGE_CSS = `
[data-item-section="decoration"] {
  align-items: center;
}

[data-item-section="decoration"] > span {
  align-items: center;
  display: inline-flex;
  font-variant-numeric: tabular-nums;
  gap: 4px;
  line-height: 1;
  white-space: nowrap;
}

[data-item-section="decoration"] > span[title*="${FILE_TREE_REVIEW_COMMENT_TITLE_MARKER}"]::before {
  background-color: var(--trees-fg-muted, #8b949e);
  content: '';
  display: block;
  flex-shrink: 0;
  height: 14px;
  -webkit-mask-image: ${FILE_TREE_COMMENT_ICON_MASK_URL};
  mask-image: ${FILE_TREE_COMMENT_ICON_MASK_URL};
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  order: 2;
  width: 14px;
}

[data-item-section="decoration"] > span[title*="${FILE_TREE_REVIEW_COMMENT_TITLE_MARKER}"]::after {
  font-variant-numeric: tabular-nums;
  line-height: 1;
  order: 3;
}
`;

// Pierre renders its own search input in shadow DOM; we use a custom header instead.
export const FILE_TREE_PANEL_BASE_CSS = `
  [data-file-tree-search-container] {
    display: none !important;
  }

  :host {
    --trees-padding-inline-override: 12px;
  }

  ${FILE_TREE_COMMENT_BADGE_CSS}
`;
