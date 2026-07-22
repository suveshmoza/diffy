import {
  parsePatchFiles,
  type AnnotationSide,
  type ChangeTypes,
  type CodeViewItem,
  type DiffLineAnnotation,
  type FileDiffMetadata,
} from '@pierre/diffs';

import {
  classifyChangedFile,
  getImageDiffSides,
  getMediaFileChangeType,
  isMediaFileExcludedFromCodeView,
} from '@/lib/diff/media-files';
import {
  buildPatchFromFiles,
  getPullRequestContentCacheKey,
  type GitHubPullRequestFile,
  type GitHubPullRequestReviewComment,
  type PullRequestDiffData,
} from '@/lib/github/api';
import {
  attachReviewCommentsToItems,
  mapReviewCommentsToItems,
  type ReviewAnnotationMetadata,
  type ReviewMediaMetadata,
} from '@/lib/review/comments';

export type CodeViewItemsResult = {
  items: CodeViewItem<ReviewAnnotationMetadata>[];
  diffPathSet: ReadonlySet<string>;
  fileByPath: ReadonlyMap<string, GitHubPullRequestFile>;
  reviewCommentCountByPath: ReadonlyMap<string, number>;
  orphanedReviewThreadsByItemId: ReadonlyMap<string, ReviewAnnotationMetadata[]>;
};

const codeViewItemsCache = new Map<string, CodeViewItemsResult>();

function getReviewCommentsCacheSuffix(comments: GitHubPullRequestReviewComment[]): string {
  let idSum = 0;
  let newestUpdatedAt = '';

  for (const comment of comments) {
    idSum += comment.id;
    if (comment.updated_at > newestUpdatedAt) {
      newestUpdatedAt = comment.updated_at;
    }
  }

  return `${comments.length}:${idSum}:${newestUpdatedAt}`;
}

function getCodeViewItemsCacheKey(data: PullRequestDiffData): string {
  return `${getPullRequestContentCacheKey(data.ref, data.pullRequest.head.sha)}@${getReviewCommentsCacheSuffix(data.reviewComments)}`;
}

export function buildCodeViewItems(data: PullRequestDiffData): CodeViewItemsResult {
  const cacheKey = getCodeViewItemsCacheKey(data);
  const cached = codeViewItemsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const patch = data.patch.trim() ? data.patch : buildPatchFromFiles(data.files);

  let parsed;
  try {
    parsed = parsePatchFiles(patch, cacheKey, true);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse pull request diff: ${detail}`, { cause: error });
  }

  const fileDiffByPath = new Map<string, FileDiffMetadata>();
  const diffPathSet = new Set<string>();

  for (const parsedPatch of parsed) {
    for (const fileDiff of parsedPatch.files) {
      addDiffPath(diffPathSet, fileDiff.name);
      fileDiffByPath.set(fileDiff.name, fileDiff);
      if (fileDiff.prevName) {
        addDiffPath(diffPathSet, fileDiff.prevName);
        // Prefer current name as canonical key; still allow lookup by previous.
        if (!fileDiffByPath.has(fileDiff.prevName)) {
          fileDiffByPath.set(fileDiff.prevName, fileDiff);
        }
      }
    }
  }

  const fileByPath = new Map<string, GitHubPullRequestFile>();
  const items: CodeViewItem<ReviewAnnotationMetadata>[] = [];

  // Preserve PR file order so media appears inline with text files while scrolling.
  for (const file of data.files) {
    fileByPath.set(file.filename, file);

    const kind = classifyChangedFile(file);
    if (kind === 'image' || kind === 'binary') {
      items.push(createMediaCodeViewItem(file, kind));
      continue;
    }

    const fileDiff =
      fileDiffByPath.get(file.filename) ??
      (file.previous_filename ? fileDiffByPath.get(file.previous_filename) : undefined);

    if (fileDiff && !isMediaFileExcludedFromCodeView(file)) {
      items.push({
        id: getCodeViewItemId(file.filename, true),
        type: 'diff',
        fileDiff,
      });
      continue;
    }

    items.push({
      id: getCodeViewItemId(file.filename, false),
      type: 'file',
      file: {
        name: file.filename,
        contents: file.patch ?? getMissingPatchMessage(file),
      },
    });
  }

  const reviewCommentMaps = mapReviewCommentsToItems(items as CodeViewItem[], data.reviewComments);

  const result: CodeViewItemsResult = {
    items: attachReviewCommentsToItems(items as CodeViewItem[], reviewCommentMaps),
    diffPathSet,
    fileByPath,
    reviewCommentCountByPath: reviewCommentMaps.countByPath,
    orphanedReviewThreadsByItemId: reviewCommentMaps.orphanedByItemId,
  };

  codeViewItemsCache.set(cacheKey, result);
  return result;
}

function createMediaCodeViewItem(
  file: GitHubPullRequestFile,
  kind: 'image' | 'binary',
): CodeViewItem<ReviewAnnotationMetadata> {
  const changeType = getMediaFileChangeType(file);

  return {
    id: getMediaCodeViewItemId(file.filename),
    // Use a diff shell so Pierre's file header shows the same add/delete/rename icons as text files.
    type: 'diff',
    fileDiff: createMediaFileDiffMetadata(file, changeType),
    annotations: createMediaAnnotations(file, kind),
  };
}

function createMediaAnnotations(
  file: GitHubPullRequestFile,
  kind: 'image' | 'binary',
): DiffLineAnnotation<ReviewAnnotationMetadata>[] {
  if (kind === 'binary') {
    const metadata: ReviewMediaMetadata = { kind: 'media-binary' };
    return [
      {
        lineNumber: 0,
        side: getMediaAnnotationSide(getMediaFileChangeType(file)),
        metadata,
      },
    ];
  }

  const sides = getImageDiffSides(file);

  // Place before/after in Pierre's deletion/addition columns so split view is truly
  // side-by-side. Unified view keeps both slots in one row (styled as a 2-col grid).
  if (sides.showBefore && sides.showAfter) {
    return [
      {
        lineNumber: 0,
        side: 'deletions',
        metadata: { kind: 'media-image', pane: 'before' },
      },
      {
        lineNumber: 0,
        side: 'additions',
        metadata: { kind: 'media-image', pane: 'after' },
      },
    ];
  }

  if (sides.showBefore) {
    return [
      {
        lineNumber: 0,
        side: 'deletions',
        metadata: { kind: 'media-image', pane: 'only' },
      },
    ];
  }

  return [
    {
      lineNumber: 0,
      side: 'additions',
      metadata: { kind: 'media-image', pane: 'only' },
    },
  ];
}

function createMediaFileDiffMetadata(
  file: GitHubPullRequestFile,
  changeType: ChangeTypes,
): FileDiffMetadata {
  return {
    name: file.filename,
    prevName: file.previous_filename ?? undefined,
    type: changeType,
    hunks: [],
    splitLineCount: 0,
    unifiedLineCount: 0,
    isPartial: true,
    deletionLines: [],
    additionLines: [],
  };
}

function getMediaAnnotationSide(changeType: ChangeTypes): AnnotationSide {
  return changeType === 'deleted' ? 'deletions' : 'additions';
}

export function invalidateCodeViewItemsCache(ref?: {
  owner: string;
  repo: string;
  pullNumber: number;
}): void {
  if (!ref) {
    codeViewItemsCache.clear();
    return;
  }

  const prefix = `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.pullNumber}`;
  for (const key of codeViewItemsCache.keys()) {
    if (key.startsWith(prefix)) {
      codeViewItemsCache.delete(key);
    }
  }
}

function getMediaCodeViewItemId(path: string): string {
  return `media:${path}`;
}

function getCodeViewItemId(path: string, hasDiff: boolean): string {
  return hasDiff ? `diff:${path}` : `file:${path}`;
}

export function getCodeViewItemIdForFile(
  file: GitHubPullRequestFile,
  diffPathSet: ReadonlySet<string>,
): string {
  if (isMediaFileExcludedFromCodeView(file)) {
    return getMediaCodeViewItemId(file.filename);
  }
  return getCodeViewItemId(file.filename, isFileCoveredByDiff(file, diffPathSet));
}

function addDiffPath(diffPathSet: Set<string>, path: string): void {
  diffPathSet.add(path);
}

function isFileCoveredByDiff(
  file: GitHubPullRequestFile,
  diffPathSet: ReadonlySet<string>,
): boolean {
  if (diffPathSet.has(file.filename)) {
    return true;
  }

  return file.previous_filename != null && diffPathSet.has(file.previous_filename);
}

function getMissingPatchMessage(file: GitHubPullRequestFile): string {
  if (file.status === 'renamed' && file.previous_filename) {
    return `Renamed from ${file.previous_filename}. GitHub did not include diff text for this file.`;
  }

  if (file.status === 'copied' && file.previous_filename) {
    return `Copied from ${file.previous_filename}. GitHub did not include diff text for this file.`;
  }

  return 'GitHub did not include diff text for this file.';
}

export function isLargePullRequestData(data: PullRequestDiffData): boolean {
  return data.files.length > 150 || data.patch.length > 500_000;
}
