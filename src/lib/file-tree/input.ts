import {
  preparePresortedFileTreeInput,
  type FileTreePreparedInput,
  type FileTreeRowDecoration,
  type GitStatusEntry,
} from '@pierre/trees';

import type { GitHubPullRequestFile } from '@/lib/github/api';

import { formatReviewCommentDecorationTitle } from './comment-badge';

export type PreparedFileTreeInput = {
  annotationsByPath: Map<string, FileTreeRowDecoration>;
  gitStatus: GitStatusEntry[];
  paths: string[];
  pathsSignature: string;
  preparedInput: FileTreePreparedInput;
};

const preparedInputCache = new Map<string, FileTreePreparedInput>();

function getPathsSignature(paths: readonly string[]): string {
  return paths.join('\0');
}

function getOrCreatePreparedInput(paths: string[]): FileTreePreparedInput {
  const signature = getPathsSignature(paths);
  const cached = preparedInputCache.get(signature);
  if (cached) {
    return cached;
  }

  const preparedInput = preparePresortedFileTreeInput(paths);
  preparedInputCache.set(signature, preparedInput);
  return preparedInput;
}

export function createFileTreeInput(
  files: GitHubPullRequestFile[],
  reviewCommentCountByPath: ReadonlyMap<string, number> = new Map(),
): PreparedFileTreeInput {
  const paths = files.map((file) => file.filename);
  const pathsSignature = getPathsSignature(paths);
  const annotationsByPath = new Map<string, FileTreeRowDecoration>();
  const gitStatus: GitStatusEntry[] = [];

  for (const file of files) {
    const reviewCommentCount = reviewCommentCountByPath.get(file.filename) ?? 0;
    annotationsByPath.set(file.filename, formatFileTreeRowDecoration(file, reviewCommentCount));
    gitStatus.push({ path: file.filename, status: toTreeGitStatus(file.status) });
  }

  return {
    annotationsByPath,
    gitStatus,
    paths,
    pathsSignature,
    preparedInput: getOrCreatePreparedInput(paths),
  };
}

function formatFileTreeRowDecoration(
  file: GitHubPullRequestFile,
  reviewCommentCount: number,
): FileTreeRowDecoration {
  const changeSummary = formatFileChangeAnnotation(file);
  const changeTitle = `${file.changes.toLocaleString()} total changes: +${file.additions.toLocaleString()} / -${file.deletions.toLocaleString()}`;

  if (reviewCommentCount === 0) {
    return {
      text: changeSummary,
      title: changeTitle,
    };
  }

  return {
    text: `${changeSummary} · `,
    title: formatReviewCommentDecorationTitle(changeTitle, reviewCommentCount),
  };
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
