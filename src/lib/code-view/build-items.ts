import { parsePatchFiles, type CodeViewItem } from '@pierre/diffs';

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

  const diffPathSet = new Set<string>();
  const items: CodeViewItem[] = [];

  for (const parsedPatch of parsed) {
    for (const fileDiff of parsedPatch.files) {
      addDiffPath(diffPathSet, fileDiff.name);
      if (fileDiff.prevName) {
        addDiffPath(diffPathSet, fileDiff.prevName);
      }

      items.push({
        id: getCodeViewItemId(fileDiff.name, true),
        type: 'diff',
        fileDiff,
      });
    }
  }

  const fileByPath = new Map<string, GitHubPullRequestFile>();
  for (const file of data.files) {
    fileByPath.set(file.filename, file);

    if (isFileCoveredByDiff(file, diffPathSet)) {
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

  const reviewCommentMaps = mapReviewCommentsToItems(items, data.reviewComments);

  const result: CodeViewItemsResult = {
    items: attachReviewCommentsToItems(items, reviewCommentMaps),
    diffPathSet,
    fileByPath,
    reviewCommentCountByPath: reviewCommentMaps.countByPath,
    orphanedReviewThreadsByItemId: reviewCommentMaps.orphanedByItemId,
  };

  codeViewItemsCache.set(cacheKey, result);
  return result;
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

function getCodeViewItemId(path: string, hasDiff: boolean): string {
  return hasDiff ? `diff:${path}` : `file:${path}`;
}

export function getCodeViewItemIdForFile(
  file: GitHubPullRequestFile,
  diffPathSet: ReadonlySet<string>,
): string {
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
