import type { ImageDiffSideSource } from './image-diff-cache';

export function formatImageBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width.toLocaleString()}×${height.toLocaleString()}`;
}

export type ImageResizeDelta = {
  from: string;
  to: string;
  changed: boolean;
};

export function getResizeDelta(
  before: ImageDiffSideSource | null,
  after: ImageDiffSideSource | null,
): ImageResizeDelta | null {
  if (!before || !after) {
    return null;
  }

  return {
    from: formatDimensions(before.width, before.height),
    to: formatDimensions(after.width, after.height),
    changed: before.width !== after.width || before.height !== after.height,
  };
}
