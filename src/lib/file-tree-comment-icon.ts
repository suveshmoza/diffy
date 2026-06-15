const COMMENT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9h8"/><path d="M8 13h6"/><path d="M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3l-3 -3"/></svg>`;

export const FILE_TREE_COMMENT_ICON_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(
  COMMENT_ICON_SVG,
)}")`;

export const FILE_TREE_COMMENT_ICON_SIZE = '16px';

export const COMMENT_ICON_MASK_STYLE = {
  backgroundColor: 'currentColor',
  display: 'block',
  flexShrink: 0,
  height: FILE_TREE_COMMENT_ICON_SIZE,
  width: FILE_TREE_COMMENT_ICON_SIZE,
  WebkitMaskImage: FILE_TREE_COMMENT_ICON_MASK_URL,
  maskImage: FILE_TREE_COMMENT_ICON_MASK_URL,
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
} as const;
