import { IconSearch, IconX } from '@pierre/icons';
import type { FileTreeRowDecorationRenderer } from '@pierre/trees';
import { FileTree, useFileTree, useFileTreeSearch } from '@pierre/trees/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTreeThemeStyles } from '@/hooks/useTreeThemeStyles';
import {
  buildCommentBadgeCountCss,
  FILE_TREE_REVIEW_COMMENT_TITLE_MARKER,
} from '@/lib/file-tree/comment-badge';
import {
  FILE_TREE_COMMENT_ICON_MASK_URL,
  FILE_TREE_COMMENT_ICON_SIZE,
} from '@/lib/file-tree/comment-icon';
import { createFileTreeInput } from '@/lib/file-tree/input';
import type { GitHubPullRequest, GitHubPullRequestFile } from '@/lib/github/api';
import type { ViewedProgress } from '@/lib/review/viewed-files';

import { ReviewProgress } from '../review/ReviewProgress';
import { SidebarPrInfo } from './SidebarPrInfo';
import { SidebarPrStats } from './SidebarPrStats';

const treePanelClassName =
  'flex h-full min-h-0 flex-col border-[var(--trees-theme-sidebar-border,var(--border))]';
const treePanelTopClassName =
  'flex shrink-0 flex-col gap-2 border-b border-[var(--trees-theme-sidebar-border,var(--border))] bg-[var(--trees-theme-sidebar-bg,var(--background))] pb-2';
const treeSearchWrapClassName =
  'box-border flex w-full shrink-0 flex-col gap-1.5 border-b border-[var(--trees-theme-sidebar-border,var(--border))] bg-[var(--trees-theme-sidebar-bg,var(--background))] px-3 py-2.5';

const TREE_INITIAL_VISIBLE_ROW_COUNT = 80;
const TREE_OVERSCAN = 12;

type FileTreePanelProps = {
  files: GitHubPullRequestFile[];
  selectedPath: string | null;
  reviewCommentCountByPath?: ReadonlyMap<string, number>;
  onSelectPath: (path: string) => void;
  pullRequest: GitHubPullRequest;
  reviewCommentCount: number;
  reviewProgress?: ViewedProgress | null;
  onJumpToNextUnviewed?: () => void;
};

const FILE_TREE_COMMENT_BADGE_CSS = `
  [data-item-section="decoration"] {
    align-items: center;
  }

  [data-item-section="decoration"] > span[title*="${FILE_TREE_REVIEW_COMMENT_TITLE_MARKER}"] {
    align-items: center;
    display: inline-flex;
    gap: 3px;
    line-height: 1;
    white-space: nowrap;
  }

  [data-item-section="decoration"] > span[title*="${FILE_TREE_REVIEW_COMMENT_TITLE_MARKER}"]::before {
    background-color: var(--trees-fg-muted, #8b949e);
    content: '';
    display: block;
    flex-shrink: 0;
    height: ${FILE_TREE_COMMENT_ICON_SIZE};
    -webkit-mask-image: ${FILE_TREE_COMMENT_ICON_MASK_URL};
    mask-image: ${FILE_TREE_COMMENT_ICON_MASK_URL};
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    order: 2;
    width: ${FILE_TREE_COMMENT_ICON_SIZE};
  }

  [data-item-section="decoration"] > span[title*="${FILE_TREE_REVIEW_COMMENT_TITLE_MARKER}"]::after {
    font-variant-numeric: tabular-nums;
    line-height: 1;
    order: 3;
  }
`;

// Pierre renders its own search input in shadow DOM; we use a custom header instead.
const FILE_TREE_PANEL_BASE_CSS = `
  [data-file-tree-search-container] {
    display: none !important;
  }

  :host {
    --trees-padding-inline-override: 12px;
  }

  ${FILE_TREE_COMMENT_BADGE_CSS}
`;

type FileTreeSearchHeaderProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  matchingPaths: readonly string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

function FileTreeSearchHeader({
  inputRef,
  matchingPaths,
  searchQuery,
  onSearchQueryChange,
}: FileTreeSearchHeaderProps) {
  const hasQuery = searchQuery.trim().length > 0;
  const matchCount = matchingPaths.length;

  const stopGitHubKeybindings = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    stopGitHubKeybindings(event);

    if (event.key === 'Escape') {
      event.preventDefault();
      onSearchQueryChange('');
    }
  };

  return (
    <div
      className={treeSearchWrapClassName}
      onKeyDownCapture={stopGitHubKeybindings}
      onKeyUpCapture={stopGitHubKeybindings}
    >
      <div className='relative'>
        <IconSearch
          size={14}
          className='pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground'
        />
        <Input
          ref={inputRef}
          className='h-8 bg-[var(--trees-theme-input-bg,var(--background))] pr-8 pl-8 text-xs'
          type='text'
          inputMode='search'
          autoComplete='off'
          spellCheck={false}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={stopGitHubKeybindings}
          placeholder='Filter files'
          aria-label='Filter changed files'
        />
        {hasQuery ? (
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            className='absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground'
            aria-label='Clear filter'
            onClick={() => onSearchQueryChange('')}
          >
            <IconX size={12} />
          </Button>
        ) : null}
      </div>
      {hasQuery ? (
        <p
          className='m-0 text-[11px] text-muted-foreground'
          aria-live='polite'
        >
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </p>
      ) : null}
    </div>
  );
}

export function FileTreePanel({
  files,
  selectedPath,
  reviewCommentCountByPath,
  onSelectPath,
  pullRequest,
  reviewCommentCount,
  reviewProgress,
  onJumpToNextUnviewed,
}: FileTreePanelProps) {
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

  const handleSearchQueryChange = useCallback((query: string) => {
    const shouldKeepFocus = document.activeElement === searchInputRef.current;
    setSearchQuery(query);
    if (shouldKeepFocus) {
      queueMicrotask(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      });
    }
  }, []);

  const renderRowDecoration = useCallback<FileTreeRowDecorationRenderer>(
    ({ item }) => {
      return treeInput.annotationsByPath.get(item.path) ?? null;
    },
    [treeInput.annotationsByPath],
  );

  const { model } = useFileTree({
    preparedInput: treeInput.preparedInput,
    initialExpansion: 'open',
    icons: 'complete',
    gitStatus: treeInput.gitStatus,
    renderRowDecoration,
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    searchBlurBehavior: 'retain',
    unsafeCSS: fileTreePanelCss,
    initialVisibleRowCount: TREE_INITIAL_VISIBLE_ROW_COUNT,
    overscan: TREE_OVERSCAN,
    onSelectionChange: handleSelectionChange,
  });

  const search = useFileTreeSearch(model);

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
  }, [model, treeInput]);

  useEffect(() => {
    isProgrammaticSelectionRef.current = true;
    try {
      if (!selectedPath) {
        for (const path of model.getSelectedPaths()) {
          model.getItem(path)?.deselect();
        }
        return;
      }

      if (!treeInput.annotationsByPath.has(selectedPath)) {
        return;
      }

      const selectedPaths = model.getSelectedPaths();
      if (selectedPaths.length === 1 && selectedPaths[0] === selectedPath) {
        return;
      }

      for (const path of selectedPaths) {
        if (path !== selectedPath) {
          model.getItem(path)?.deselect();
        }
      }

      if (!selectedPaths.includes(selectedPath)) {
        model.getItem(selectedPath)?.select();
      }
    } finally {
      isProgrammaticSelectionRef.current = false;
    }
  }, [model, selectedPath, treeInput.annotationsByPath]);

  return (
    <div
      className={treePanelClassName}
      style={treeThemeStyles}
    >
      <div className={treePanelTopClassName}>
        <SidebarPrStats
          pullRequest={pullRequest}
          reviewCommentCount={reviewCommentCount}
        />
        {reviewProgress && onJumpToNextUnviewed ? (
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
