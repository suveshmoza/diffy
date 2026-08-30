import type { DiffIndicators } from '@pierre/diffs';
import { IconCodeStyleBars, IconEyeSlash, IconSymbolDiffstat, IconWordWrap } from '@pierre/icons';

import { IconArrowsHorizontal } from '@/components/icons/ArrowsHorizontal';
import type {
  CodeViewDisplayPrefs,
  HunkSeparatorStyle,
  ImageCompareMode,
} from '@/lib/diff/display-prefs';

import type { SegmentOption } from './SegmentedControl';

const ICON_SIZE = 16;

export type LineNumberChoice = 'show' | 'hide';

export const DIFF_INDICATOR_OPTIONS: readonly SegmentOption<DiffIndicators>[] = [
  {
    value: 'classic',
    label: 'Classic',
    icon: <IconSymbolDiffstat />,
  },
  {
    value: 'bars',
    label: 'Bars',
    icon: <IconCodeStyleBars />,
  },
  {
    value: 'none',
    label: 'None',
    icon: <IconEyeSlash />,
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
