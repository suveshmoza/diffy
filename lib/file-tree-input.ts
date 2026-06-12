import {
  prepareFileTreeInput,
  type FileTreePreparedInput,
  type GitStatusEntry,
} from '@pierre/trees';

import type { GitHubPullRequestFile } from './github';

export type PreparedFileTreeInput = {
  annotationsByPath: Map<string, { text: string; title: string }>;
  gitStatus: GitStatusEntry[];
  paths: string[];
  preparedInput: FileTreePreparedInput;
};

export function createFileTreeInput(
  files: GitHubPullRequestFile[],
  reviewCommentCountByPath: ReadonlyMap<string, number> = new Map(),
): PreparedFileTreeInput {
  const paths = files.map((file) => file.filename);
  const annotationsByPath = new Map<string, { text: string; title: string }>();
  const gitStatus: GitStatusEntry[] = [];

  for (const file of files) {
    const reviewCommentCount = reviewCommentCountByPath.get(file.filename) ?? 0;
    annotationsByPath.set(file.filename, {
      text: formatFileTreeAnnotation(file, reviewCommentCount),
      title: formatFileTreeAnnotationTitle(file, reviewCommentCount),
    });
    gitStatus.push({ path: file.filename, status: toTreeGitStatus(file.status) });
  }

  return {
    annotationsByPath,
    gitStatus,
    paths,
    preparedInput: prepareFileTreeInput(paths, { flattenEmptyDirectories: true }),
  };
}

function formatFileTreeAnnotation(file: GitHubPullRequestFile, reviewCommentCount: number): string {
  const changeSummary = formatFileChangeAnnotation(file);
  if (reviewCommentCount === 0) {
    return changeSummary;
  }

  const label = reviewCommentCount === 1 ? 'comment' : 'comments';
  return `${changeSummary} · ${reviewCommentCount} ${label}`;
}

function formatFileTreeAnnotationTitle(
  file: GitHubPullRequestFile,
  reviewCommentCount: number,
): string {
  const changeTitle = `${file.changes.toLocaleString()} total changes: +${file.additions.toLocaleString()} / -${file.deletions.toLocaleString()}`;
  if (reviewCommentCount === 0) {
    return changeTitle;
  }

  const commentLabel = reviewCommentCount === 1 ? 'review comment' : 'review comments';
  return `${changeTitle} · ${reviewCommentCount.toLocaleString()} ${commentLabel}`;
}

function formatFileChangeAnnotation(file: GitHubPullRequestFile): string {
  if (file.additions === 0 && file.deletions === 0) {
    return file.changes > 0 ? file.changes.toLocaleString() : '0';
  }

  if (file.additions === 0) {
    return `-${file.deletions.toLocaleString()}`;
  }

  if (file.deletions === 0) {
    return `+${file.additions.toLocaleString()}`;
  }

  return `+${file.additions.toLocaleString()} / -${file.deletions.toLocaleString()}`;
}

function toTreeGitStatus(
  status: GitHubPullRequestFile['status'],
): 'added' | 'deleted' | 'modified' | 'renamed' {
  switch (status) {
    case 'added':
      return 'added';
    case 'removed':
      return 'deleted';
    case 'renamed':
      return 'renamed';
    default:
      return 'modified';
  }
}
