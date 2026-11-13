import {
  preparePresortedFileTreeInput,
  type FileTreePreparedInput,
  type FileTreeRowDecoration,
  type GitStatusEntry,
} from '@pierre/trees';

import type { GitHubPullRequestFile } from '@/domains/github/api';

import { formatReviewCommentDecorationTitle } from './comment-badge';

export type PreparedFileTreeInput = {
  annotationsByPath: Map<string, FileTreeRowDecoration>;
  gitStatus: GitStatusEntry[];
  paths: string[];
  pathsSignature: string;
  preparedInput: FileTreePreparedInput;
};

type FileTreeRowDecorationTextPart = NonNullable<
  Extract<FileTreeRowDecoration, { text: string }>['parts']
>[number];

/** Pierre tree status colors — resolve inside the FileTree shadow tree. */
const ADDITION_COLOR = 'var(--trees-status-added)';
const DELETION_COLOR = 'var(--trees-status-deleted)';

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
  const parts = formatFileChangeParts(file);
  const text = parts.map((part) => part.text).join('');
  const changeTitle = `${file.changes.toLocaleString()} total changes: +${file.additions.toLocaleString()} -${file.deletions.toLocaleString()}`;

  if (reviewCommentCount === 0) {
    return {
      text,
      title: changeTitle,
      parts,
    };
  }

  return {
    text,
    title: formatReviewCommentDecorationTitle(changeTitle, reviewCommentCount),
    parts,
  };
}

function formatFileChangeParts(file: GitHubPullRequestFile): FileTreeRowDecorationTextPart[] {
  if (file.additions === 0 && file.deletions === 0) {
    return [{ text: file.changes > 0 ? file.changes.toLocaleString() : '0' }];
  }

  const parts: FileTreeRowDecorationTextPart[] = [];

  if (file.additions > 0) {
    parts.push({
      text: `+${file.additions.toLocaleString()}`,
      color: ADDITION_COLOR,
    });
  }

  if (file.deletions > 0) {
    parts.push({
      text: `-${file.deletions.toLocaleString()}`,
      color: DELETION_COLOR,
    });
  }

  return parts;
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
