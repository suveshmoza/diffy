import type { DiffIndicators } from '@pierre/diffs';
import { IconCodeStyleBars, IconEyeSlash, IconSymbolDiffstat, IconWordWrap } from '@pierre/icons';

import { IconArrowsHorizontal } from '@/components/icons/ArrowsHorizontal';
import type {
  CodeViewDisplayPrefs,
  HunkSeparatorStyle,
  ImageCompareMode,
} from '@/lib/diff/display-prefs';
import {
  CODE_FONT_SIZES,
  CODE_LINE_HEIGHTS,
  type CodeFontSize,
  type CodeLineHeight,
} from '@/lib/diff/font-prefs';

import type { SegmentOption } from './SegmentedControl';

const ICON_SIZE = 16;

export type LineNumberChoice = 'show' | 'hide';

export const CODE_FONT_SIZE_OPTIONS: readonly SegmentOption<CodeFontSize>[] = CODE_FONT_SIZES.map(
  (size) => ({
    value: size,
    label: String(size),
  }),
);

export const CODE_LINE_HEIGHT_OPTIONS: readonly SegmentOption<CodeLineHeight>[] =
  CODE_LINE_HEIGHTS.map((height) => ({
    value: height,
    label: String(height),
  }));

export const DIFF_INDICATOR_OPTIONS: readonly SegmentOption<DiffIndicators>[] = [
  {
    value: 'classic',
    label: 'Classic',
    icon: <IconSymbolDiffstat size={ICON_SIZE} />,
  },
  {
    value: 'bars',
    label: 'Bars',
    icon: <IconCodeStyleBars size={ICON_SIZE} />,
  },
  {
    value: 'none',
    label: 'None',
    icon: <IconEyeSlash size={ICON_SIZE} />,
  },
];

export const HUNK_SEPARATOR_OPTIONS: readonly SegmentOption<HunkSeparatorStyle>[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'line-info', label: 'Line info' },
  { value: 'line-info-basic', label: 'Line info (basic)' },
];

export const LINE_NUMBER_OPTIONS: readonly SegmentOption<LineNumberChoice>[] = [
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
];

export const OVERFLOW_OPTIONS: readonly SegmentOption<CodeViewDisplayPrefs['overflow']>[] = [
  {
    value: 'scroll',
    label: 'Scroll',
    icon: <IconArrowsHorizontal size={ICON_SIZE} />,
  },
  {
    value: 'wrap',
    label: 'Wrap',
    icon: <IconWordWrap size={ICON_SIZE} />,
  },
];

export const IMAGE_COMPARE_MODE_OPTIONS: readonly SegmentOption<ImageCompareMode>[] = [
  { value: '2up', label: '2-up' },
  { value: 'swipe', label: 'Swipe' },
  { value: 'onion', label: 'Onion' },
];
