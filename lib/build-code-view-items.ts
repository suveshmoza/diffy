import { parsePatchFiles, type CodeViewItem } from '@pierre/diffs';

import {
  buildPatchFromFiles,
  type GitHubPullRequestFile,
  type PullRequestDiffData,
} from './github';

export type CodeViewItemsResult = {
  items: CodeViewItem[];
  diffPathSet: ReadonlySet<string>;
};

export function buildCodeViewItems(data: PullRequestDiffData): CodeViewItemsResult {
  const cacheKey = `${data.ref.owner}-${data.ref.repo}-${data.ref.pullNumber}`;
  const patch = data.patch.trim() ? data.patch : buildPatchFromFiles(data.files);
  const parsed = parsePatchFiles(patch, cacheKey, true);
  const diffPathSet = new Set<string>();
  const items: CodeViewItem[] = [];

  for (const fileDiff of parsed.flatMap((parsedPatch) => parsedPatch.files)) {
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

  for (const file of data.files) {
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

  return { items, diffPathSet };
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
