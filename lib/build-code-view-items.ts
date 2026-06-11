import { parsePatchFiles, type CodeViewItem } from '@pierre/diffs';
import { buildPatchFromFiles, type GitHubPullRequestFile, type PullRequestDiffData } from './github';

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

  for (const fileDiff of parsed.flatMap((patch) => patch.files)) {
    diffPathSet.add(fileDiff.name);
    items.push({
      id: getCodeViewItemId(fileDiff.name, true),
      type: 'diff',
      fileDiff,
    });
  }

  for (const file of data.files) {
    if (diffPathSet.has(file.filename)) {
      continue;
    }

    items.push({
      id: getCodeViewItemId(file.filename, false),
      type: 'file',
      file: {
        name: file.filename,
        contents: file.patch ?? '(no text patch available for this file)',
      },
    });
  }

  return { items, diffPathSet };
}

function getCodeViewItemId(path: string, hasDiff: boolean): string {
  return hasDiff ? `diff:${path}` : `file:${path}`;
}

export function getCodeViewItemIdForFile(file: GitHubPullRequestFile, diffPathSet: ReadonlySet<string>): string {
  return getCodeViewItemId(file.filename, diffPathSet.has(file.filename));
}
