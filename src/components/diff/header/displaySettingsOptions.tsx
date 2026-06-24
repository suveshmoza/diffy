import type { DiffIndicators } from '@pierre/diffs';
import {
  IconArrowsHorizontal,
  IconEyeOff,
  IconLayoutDistributeVertical,
  IconPlusMinus,
  IconTextWrap,
} from '@tabler/icons-react';

import type { CodeViewDisplayPrefs, HunkSeparatorStyle } from '@/lib/diff/display-prefs';

import type { SegmentOption } from './SegmentedControl';

const ICON_SIZE = 16;

export type LineNumberChoice = 'show' | 'hide';

export const DIFF_INDICATOR_OPTIONS: readonly SegmentOption<DiffIndicators>[] = [
  {
    value: 'classic',
    label: 'Classic',
    icon: (
      <IconPlusMinus
        size={ICON_SIZE}
        stroke={2}
      />
    ),
  },
  {
    value: 'bars',
    label: 'Bars',
    icon: (
      <IconLayoutDistributeVertical
        size={ICON_SIZE}
        stroke={2}
      />
    ),
  },
  {
    value: 'none',
    label: 'None',
    icon: (
      <IconEyeOff
        size={ICON_SIZE}
        stroke={2}
      />
    ),
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
    icon: (
      <IconArrowsHorizontal
        size={ICON_SIZE}
        stroke={2}
      />
    ),
  },
  {
    value: 'wrap',
    label: 'Wrap',
    icon: (
      <IconTextWrap
        size={ICON_SIZE}
        stroke={2}
      />
    ),
  },
];
