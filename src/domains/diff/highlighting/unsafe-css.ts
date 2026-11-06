/** App-specific CodeView unsafe CSS. Theme colors come from @pierre/diffs, not here. */
export const CODE_VIEW_CUSTOM_CSS = `
[data-annotation-content] {
  align-self: stretch;
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  width: 100%;
  word-break: break-word;
}

/*
 * File-level media annotations (-1,-1): in unified view Pierre concatenates
 * before+after into one annotation row. Keep them side-by-side always.
 */
[data-line-annotation="-1,-1"] [data-annotation-content]:has(> slot[name="annotation-deletions-0"]):has(> slot[name="annotation-additions-0"]) {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

[data-line-annotation="-1,-1"] [data-annotation-content] ::slotted(div) {
  min-width: 0;
  width: 100%;
}

/* Match normal diff annotation chrome instead of Diffy panel chrome. */
[data-line-annotation="-1,-1"] {
  --diffs-annotation-bg: var(--diffs-bg);
  --diffs-computed-decoration-bg: var(--diffs-bg);
  --diffs-computed-diff-line-bg: var(--diffs-bg);
  --diffs-computed-selected-line-bg: var(--diffs-bg);
  --diffs-line-bg: var(--diffs-bg);
  background: var(--diffs-bg);
}
`;
