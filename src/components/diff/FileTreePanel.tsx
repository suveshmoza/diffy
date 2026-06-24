import type { FileTreeRowDecorationRenderer } from '@pierre/trees';
import { FileTree, useFileTree, useFileTreeSearch } from '@pierre/trees/react';
import { IconSearch, IconX } from '@tabler/icons-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

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

import { SidebarPrInfo } from './SidebarPrInfo';
import { SidebarPrStats } from './SidebarPrStats';

const TREE_INITIAL_VISIBLE_ROW_COUNT = 80;
const TREE_OVERSCAN = 12;

type FileTreePanelProps = {
  files: GitHubPullRequestFile[];
  selectedPath: string | null;
  reviewCommentCountByPath?: ReadonlyMap<string, number>;
  onSelectPath: (path: string) => void;
  pullRequest: GitHubPullRequest;
  reviewCommentCount: number;
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
      className='gprv-tree-search-wrap'
      onKeyDownCapture={stopGitHubKeybindings}
      onKeyUpCapture={stopGitHubKeybindings}
    >
      <label className='gprv-tree-search-field'>
        <IconSearch
          size={14}
          stroke={2}
          className='gprv-tree-search-icon'
        />
        <input
          ref={inputRef}
          className='gprv-tree-search'
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
          <button
            className='gprv-tree-search-clear'
            type='button'
            aria-label='Clear filter'
            onClick={() => onSearchQueryChange('')}
          >
            <IconX size={12} />
          </button>
        ) : null}
      </label>
      {hasQuery ? (
        <p
          className='gprv-tree-search-meta'
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
  const annotationsByPathRef = useRef(treeInput.annotationsByPath);
  const pathsSignatureRef = useRef(treeInput.pathsSignature);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const keepSearchFocusRef = useRef(false);
  const isProgrammaticSelectionRef = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
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
    keepSearchFocusRef.current = document.activeElement === searchInputRef.current;
    setSearchQuery(query);
  }, []);
  annotationsByPathRef.current = treeInput.annotationsByPath;

  const renderRowDecoration = useCallback<FileTreeRowDecorationRenderer>(({ item }) => {
    return annotationsByPathRef.current.get(item.path) ?? null;
  }, []);

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

  // Pierre auto-focuses a hidden internal search input when search opens.
  useLayoutEffect(() => {
    if (!keepSearchFocusRef.current) {
      return;
    }

    keepSearchFocusRef.current = false;
    searchInputRef.current?.focus({ preventScroll: true });
  }, [searchQuery]);

  useEffect(() => {
    return model.subscribe(() => {
      const query = searchQueryRef.current;
      if (query && model.getSearchValue() !== query) {
        model.setSearch(query);
      }
    });
  }, [model]);

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
      className='gprv-tree-panel'
      style={treeThemeStyles}
    >
      <SidebarPrStats
        pullRequest={pullRequest}
        reviewCommentCount={reviewCommentCount}
      />
      <FileTreeSearchHeader
        inputRef={searchInputRef}
        matchingPaths={search.matchingPaths}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
      />
      <FileTree
        className='gprv-tree'
        model={model}
        style={{ height: '100%', colorScheme: treeThemeStyles.colorScheme }}
      />
      <SidebarPrInfo pullRequest={pullRequest} />
    </div>
  );
}
