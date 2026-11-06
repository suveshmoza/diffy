import type { ChangeTypes } from '@pierre/diffs';

import type { GitHubPullRequestFile } from '@/domains/github/api';
import { isImagePath } from '@/shared/image-mime';

export type MediaFileKind = 'image' | 'binary' | 'text';

export type ImageDiffSides = {
  showBefore: boolean;
  showAfter: boolean;
  beforePath: string | null;
  afterPath: string | null;
};

/** Classify a PR changed file for media vs Pierre text rendering. */
export function classifyChangedFile(file: GitHubPullRequestFile): MediaFileKind {
  if (
    isImagePath(file.filename) ||
    (file.previous_filename != null && isImagePath(file.previous_filename))
  ) {
    return 'image';
  }

  // GitHub omits patch text for most binaries (PDF, fonts, archives, etc.).
  if (!file.patch) {
    return 'binary';
  }

  return 'text';
}

export function isMediaFileExcludedFromCodeView(file: GitHubPullRequestFile): boolean {
  const kind = classifyChangedFile(file);
  return kind === 'image' || kind === 'binary';
}

/** Which blob sides to load for an image (or opaque binary) change. */
export function getImageDiffSides(file: GitHubPullRequestFile): ImageDiffSides {
  switch (file.status) {
    case 'added':
      return {
        showBefore: false,
        showAfter: true,
        beforePath: null,
        afterPath: file.filename,
      };
    case 'removed':
      return {
        showBefore: true,
        showAfter: false,
        beforePath: file.previous_filename ?? file.filename,
        afterPath: null,
      };
    case 'renamed':
    case 'copied':
    case 'changed':
    case 'modified':
    default:
      return {
        showBefore: true,
        showAfter: true,
        beforePath: file.previous_filename ?? file.filename,
        afterPath: file.filename,
      };
  }
}

export function formatFileChangeStatus(status: GitHubPullRequestFile['status']): string {
  switch (status) {
    case 'added':
      return 'Added';
    case 'removed':
      return 'Deleted';
    case 'renamed':
      return 'Renamed';
    case 'copied':
      return 'Copied';
    case 'changed':
    case 'modified':
      return 'Modified';
    default:
      return 'Changed';
  }
}

/** Map a GitHub PR file status to Pierre's file-header change icon type. */
export function getMediaFileChangeType(file: GitHubPullRequestFile): ChangeTypes {
  switch (file.status) {
    case 'added':
      return 'new';
    case 'removed':
      return 'deleted';
    case 'renamed':
      return file.additions > 0 || file.deletions > 0 ? 'rename-changed' : 'rename-pure';
    default:
      return 'change';
  }
}
