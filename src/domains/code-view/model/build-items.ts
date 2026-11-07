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
} from '@/domains/code-view/media/media-files';
import {
  type ReviewAnnotationMetadata,
  type ReviewMediaMetadata,
} from '@/domains/code-view/model/comments';
import {
  buildPatchFromFiles,
  getPullRequestContentCacheKey,
  type GitHubPullRequestFile,
  type PullRequestDiffData,
} from '@/domains/github/api';

/** Diff content that defines the code-view items, independent of review comments. */
export type CodeViewContent = Pick<PullRequestDiffData, 'ref' | 'pullRequest' | 'files' | 'patch'>;

export type CodeViewItemsResult = {
  items: CodeViewItem<ReviewAnnotationMetadata>[];
  diffPathSet: ReadonlySet<string>;
  fileByPath: ReadonlyMap<string, GitHubPullRequestFile>;
};

const codeViewItemsCache = new Map<string, CodeViewItemsResult>();

export function buildCodeViewItems(content: CodeViewContent): CodeViewItemsResult {
  const cacheKey = getPullRequestContentCacheKey(content.ref, content.pullRequest.head.sha);
  const cached = codeViewItemsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const patch = content.patch.trim() ? content.patch : buildPatchFromFiles(content.files);

  let parsed = parsePatchFiles(patch, { cacheKeyPrefix: cacheKey, throwOnError: true });

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
  for (const file of content.files) {
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

  const result: CodeViewItemsResult = {
    items,
    diffPathSet,
    fileByPath,
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
    deletionCharacterCount: 0,
    additionCharacterCount: 0,
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

export function isLargePullRequestData(content: Pick<CodeViewContent, 'files' | 'patch'>): boolean {
  return content.files.length > 150 || content.patch.length > 500_000;
}
