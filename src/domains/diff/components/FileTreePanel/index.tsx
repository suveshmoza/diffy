import {
  FileTree as FileTreeModel,
  FILE_TREE_UNSAFE_CSS_ATTRIBUTE,
  type FileTreeRowDecorationContext,
} from '@pierre/trees';
import { FileTree, useFileTree, useFileTreeSearch } from '@pierre/trees/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTreeThemeStyles } from '@/domains/diff/hooks/useTreeThemeStyles';
import { buildCommentBadgeCountCss } from '@/domains/diff/tree/comment-badge';
import { FILE_TREE_PANEL_BASE_CSS } from '@/domains/diff/tree/comment-icon';
import { createFileTreeInput } from '@/domains/diff/tree/input';
import type { GitHubPullRequest, GitHubPullRequestFile } from '@/domains/github/api';
import { useGitHubAuth } from '@/domains/github/auth/GitHubAuthProvider';
import { SidebarPrInfo } from '@/domains/github/components/SidebarPrInfo';
import { SidebarPrStats } from '@/domains/github/components/SidebarPrStats';
import { ReviewProgress, ReviewProgressSkeleton } from '@/domains/review/components/ReviewProgress';
import type { ViewedProgress } from '@/domains/review/model/viewed-files';

import { FileTreeSearchHeader } from './components/FileTreeSearchHeader';

const TREE_INITIAL_VISIBLE_ROW_COUNT = 50;
const TREE_OVERSCAN = 8;

/** Mirrors @pierre/trees wrapUnsafeCSS — not exported from the package entry. */
function wrapFileTreeUnsafeCss(unsafeCss: string): string {
  return `@layer base, unsafe;\n@layer unsafe {\n  ${unsafeCss}\n}`;
}

function syncFileTreeUnsafeCss(model: FileTreeModel, unsafeCss: string): void {
  const host = model.getFileTreeContainer();
  const shadowRoot = host?.shadowRoot;
  if (shadowRoot == null) {
    return;
  }

  let style = shadowRoot.querySelector(`style[${FILE_TREE_UNSAFE_CSS_ATTRIBUTE}]`);
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement('style');
    style.setAttribute(FILE_TREE_UNSAFE_CSS_ATTRIBUTE, '');
    shadowRoot.appendChild(style);
  }

  style.textContent = wrapFileTreeUnsafeCss(unsafeCss);
  model.render({});
}

type FileTreePanelProps = {
  files: GitHubPullRequestFile[];
  selectedPath: string | null;
  reviewCommentCountByPath?: ReadonlyMap<string, number>;
  onSelectPath: (path: string) => void;
  pullRequest: GitHubPullRequest;
  reviewCommentCount: number;
  /** True while token / viewed-files status is still resolving. */
  isReviewProgressLoading?: boolean;
  reviewProgress?: ViewedProgress | null;
  onJumpToNextUnviewed?: () => void;
};

export function FileTreePanel({
  files,
  selectedPath,
  reviewCommentCountByPath,
  onSelectPath,
  pullRequest,
  reviewCommentCount,
  isReviewProgressLoading = false,
  reviewProgress,
  onJumpToNextUnviewed,
}: FileTreePanelProps) {
  const { hasToken, isLoading: isAuthLoading } = useGitHubAuth();
  const treeThemeStyles = useTreeThemeStyles();
  const treeInput = useMemo(
    () => createFileTreeInput(files, reviewCommentCountByPath),
    [files, reviewCommentCountByPath],
  );
  const fileTreePanelCss = useMemo(
    () => `${FILE_TREE_PANEL_BASE_CSS}\n${buildCommentBadgeCountCss(reviewCommentCountByPath)}`,
    [reviewCommentCountByPath],
  );
  const pathsSignatureRef = useRef(treeInput.pathsSignature);
  const selectedPathRef = useRef(selectedPath);
  const annotationsByPathRef = useRef(treeInput.annotationsByPath);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isProgrammaticSelectionRef = useRef(false);
  const handleSelectionChange = useCallback(
    (selectedPaths: readonly string[]) => {
      if (isProgrammaticSelectionRef.current) {
        return;
      }

      const nextPath = selectedPaths[0];
      if (nextPath) {
        onSelectPath(nextPath);
      }
    },
    [onSelectPath],
  );

  const renderRowDecoration = useCallback((context: FileTreeRowDecorationContext) => {
    return annotationsByPathRef.current.get(context.item.path) ?? null;
  }, []);

  const handleSearchQueryChange = useCallback((query: string) => {
    const shouldKeepFocus = document.activeElement === searchInputRef.current;
    setSearchQuery(query);
    if (shouldKeepFocus) {
      queueMicrotask(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      });
    }
  }, []);

  const { model } = useFileTree({
    preparedInput: treeInput.preparedInput,
    initialExpansion: 'open',
    icons: 'complete',
    gitStatus: treeInput.gitStatus,
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    searchBlurBehavior: 'retain',
    unsafeCSS: fileTreePanelCss,
    initialVisibleRowCount: TREE_INITIAL_VISIBLE_ROW_COUNT,
    overscan: TREE_OVERSCAN,
    onSelectionChange: handleSelectionChange,
    renderRowDecoration,
    density: 'compact',
  });

  const modelRef = useRef(model);

  const search = useFileTreeSearch(model);

  const syncExternalSelection = useCallback(() => {
    const currentModel = modelRef.current;
    const path = selectedPathRef.current;
    const annotationsByPath = annotationsByPathRef.current;

    isProgrammaticSelectionRef.current = true;
    try {
      if (!path) {
        for (const selected of currentModel.getSelectedPaths()) {
          currentModel.getItem(selected)?.deselect();
        }
        return;
      }

      if (!annotationsByPath.has(path)) {
        return;
      }

      const selectedPaths = currentModel.getSelectedPaths();
      if (selectedPaths.length === 1 && selectedPaths[0] === path) {
        return;
      }

      for (const selected of selectedPaths) {
        if (selected !== path) {
          currentModel.getItem(selected)?.deselect();
        }
      }

      if (!selectedPaths.includes(path)) {
        currentModel.getItem(path)?.select();
      }
    } finally {
      isProgrammaticSelectionRef.current = false;
    }
  }, []);

  useEffect(() => {
    selectedPathRef.current = selectedPath;
    syncExternalSelection();
  }, [selectedPath, syncExternalSelection]);

  // Options are mount-frozen; keep decoration data/CSS in sync and repaint rows.
  useEffect(() => {
    annotationsByPathRef.current = treeInput.annotationsByPath;
    syncFileTreeUnsafeCss(model, fileTreePanelCss);
  }, [model, fileTreePanelCss, treeInput.annotationsByPath]);

  useEffect(() => {
    if (searchQuery) {
      model.setSearch(searchQuery);
    } else {
      model.closeSearch();
    }
  }, [model, searchQuery]);

  useEffect(() => {
    return model.subscribe(() => {
      if (searchQuery && model.getSearchValue() !== searchQuery) {
        model.setSearch(searchQuery);
      }
    });
  }, [model, searchQuery]);

  useEffect(() => {
    if (pathsSignatureRef.current === treeInput.pathsSignature) {
      model.setGitStatus(treeInput.gitStatus);
      return;
    }

    pathsSignatureRef.current = treeInput.pathsSignature;
    model.resetPaths(treeInput.paths, { preparedInput: treeInput.preparedInput });
    model.setGitStatus(treeInput.gitStatus);
    setSearchQuery('');
    syncExternalSelection();
  }, [model, treeInput, syncExternalSelection]);

  useEffect(() => {
    modelRef.current = model;
    syncExternalSelection();
    return model.subscribe(syncExternalSelection);
  }, [model, syncExternalSelection]);

  // No token: hide once auth resolves. With token: skeleton until viewed-files lands.
  const showReviewProgressSkeleton = hasToken
    ? isReviewProgressLoading || reviewProgress == null
    : isAuthLoading;
  const showReviewProgress =
    hasToken &&
    !showReviewProgressSkeleton &&
    reviewProgress != null &&
    onJumpToNextUnviewed != null;

  return (
    <div
      className='flex h-full min-h-0 flex-col border-sidebar-border'
      style={treeThemeStyles}
    >
      <div className='flex shrink-0 flex-col gap-2 border-sidebar-border bg-sidebar'>
        <SidebarPrStats
          pullRequest={pullRequest}
          reviewCommentCount={reviewCommentCount}
        />
        {showReviewProgressSkeleton ? (
          <div className='px-3 pb-0.5'>
            <ReviewProgressSkeleton />
          </div>
        ) : showReviewProgress ? (
          <div className='px-3 pb-0.5'>
            <ReviewProgress
              viewed={reviewProgress.viewed}
              total={reviewProgress.total}
              onJumpToNextUnviewed={onJumpToNextUnviewed}
            />
          </div>
        ) : null}
      </div>
      <FileTreeSearchHeader
        inputRef={searchInputRef}
        matchingPaths={search.matchingPaths}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
      />
      <FileTree
        className='min-h-0 flex-1'
        model={model}
        style={{ height: '100%', colorScheme: treeThemeStyles.colorScheme }}
      />
      <SidebarPrInfo pullRequest={pullRequest} />
    </div>
  );
}
