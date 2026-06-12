import type { FileTreeRowDecorationRenderer } from '@pierre/trees';
import { FileTree, useFileTree, useFileTreeSearch } from '@pierre/trees/react';
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

import { createFileTreeInput } from '@/lib/file-tree-input';
import type { GitHubPullRequestFile } from '@/lib/github';

const TREE_INITIAL_VISIBLE_ROW_COUNT = 80;
const TREE_OVERSCAN = 12;

type FileTreePanelProps = {
  files: GitHubPullRequestFile[];
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
};

// Pierre renders its own search input in shadow DOM; we use a custom header instead.
const HIDE_BUILTIN_SEARCH_CSS = `
  [data-file-tree-search-container] {
    display: none !important;
  }
`;

type FileTreeSearchHeaderProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  matchingPaths: readonly string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onFocusNextMatch: () => void;
  onFocusPreviousMatch: () => void;
};

function FileTreeSearchHeader({
  inputRef,
  matchingPaths,
  searchQuery,
  onSearchQueryChange,
  onFocusNextMatch,
  onFocusPreviousMatch,
}: FileTreeSearchHeaderProps) {
  const hasQuery = searchQuery.trim().length > 0;
  const matchCount = matchingPaths.length;

  const stopGitHubKeybindings = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    stopGitHubKeybindings(event);

    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        onFocusPreviousMatch();
      } else {
        onFocusNextMatch();
      }
      return;
    }

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
        <span
          className='gprv-tree-search-icon'
          aria-hidden='true'
        >
          <svg
            viewBox='0 0 16 16'
            width='14'
            height='14'
            fill='currentColor'
          >
            <path d='M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04ZM11 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z' />
          </svg>
        </span>
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
            <svg
              viewBox='0 0 16 16'
              width='12'
              height='12'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z' />
            </svg>
          </button>
        ) : null}
      </label>
      {hasQuery ? (
        <p
          className='gprv-tree-search-meta'
          aria-live='polite'
        >
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          <span className='gprv-tree-search-hint'> · Enter ↓ Shift+Enter ↑</span>
        </p>
      ) : null}
    </div>
  );
}

export function FileTreePanel({ files, selectedPath, onSelectPath }: FileTreePanelProps) {
  const treeInput = useMemo(() => createFileTreeInput(files), [files]);
  const annotationsByPathRef = useRef(treeInput.annotationsByPath);
  const preparedInputRef = useRef(treeInput.preparedInput);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const keepSearchFocusRef = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

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
    initialSelectedPaths: selectedPath ? [selectedPath] : [],
    icons: 'complete',
    gitStatus: treeInput.gitStatus,
    renderRowDecoration,
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    searchBlurBehavior: 'retain',
    unsafeCSS: HIDE_BUILTIN_SEARCH_CSS,
    initialVisibleRowCount: TREE_INITIAL_VISIBLE_ROW_COUNT,
    overscan: TREE_OVERSCAN,
    onSelectionChange: (selectedPaths) => {
      const nextPath = selectedPaths[0];
      if (nextPath) {
        onSelectPath(nextPath);
      }
    },
  });

  const search = useFileTreeSearch(model);

  useEffect(() => {
    model.setSearch(searchQuery);
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
    if (preparedInputRef.current === treeInput.preparedInput) {
      return;
    }

    preparedInputRef.current = treeInput.preparedInput;
    model.resetPaths(treeInput.paths, { preparedInput: treeInput.preparedInput });
    model.setGitStatus(treeInput.gitStatus);
    setSearchQuery('');
  }, [model, treeInput]);

  useEffect(() => {
    if (selectedPath && treeInput.annotationsByPath.has(selectedPath)) {
      model.getItem(selectedPath)?.select();
      return;
    }

    for (const path of model.getSelectedPaths()) {
      model.getItem(path)?.deselect();
    }
  }, [model, selectedPath, treeInput.annotationsByPath]);

  return (
    <div className='gprv-tree-panel'>
      <FileTreeSearchHeader
        inputRef={searchInputRef}
        matchingPaths={search.matchingPaths}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onFocusNextMatch={search.focusNextMatch}
        onFocusPreviousMatch={search.focusPreviousMatch}
      />
      <FileTree
        className='gprv-tree'
        model={model}
        style={{ height: '100%' }}
      />
    </div>
  );
}
