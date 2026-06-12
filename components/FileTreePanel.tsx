import type { FileTreeRowDecorationRenderer } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { createFileTreeInput } from '@/lib/file-tree-input';
import type { GitHubPullRequestFile } from '@/lib/github';

const TREE_INITIAL_VISIBLE_ROW_COUNT = 80;
const TREE_OVERSCAN = 12;

type FileTreePanelProps = {
  files: GitHubPullRequestFile[];
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
};

export function FileTreePanel({ files, selectedPath, onSelectPath }: FileTreePanelProps) {
  const treeInput = useMemo(() => createFileTreeInput(files), [files]);
  const annotationsByPathRef = useRef(treeInput.annotationsByPath);
  const preparedInputRef = useRef(treeInput.preparedInput);
  annotationsByPathRef.current = treeInput.annotationsByPath;

  const renderRowDecoration = useCallback<FileTreeRowDecorationRenderer>(({ item }) => {
    return annotationsByPathRef.current.get(item.path) ?? null;
  }, []);

  const { model } = useFileTree({
    preparedInput: treeInput.preparedInput,
    initialExpansion: 'open',
    initialSelectedPaths: selectedPath ? [selectedPath] : [],
    icons: 'standard',
    density: 'compact',
    gitStatus: treeInput.gitStatus,
    renderRowDecoration,
    initialVisibleRowCount: TREE_INITIAL_VISIBLE_ROW_COUNT,
    overscan: TREE_OVERSCAN,
    onSelectionChange: (selectedPaths) => {
      const nextPath = selectedPaths[0];
      if (nextPath) {
        onSelectPath(nextPath);
      }
    },
  });

  useEffect(() => {
    if (preparedInputRef.current === treeInput.preparedInput) {
      return;
    }

    preparedInputRef.current = treeInput.preparedInput;
    model.resetPaths(treeInput.paths, { preparedInput: treeInput.preparedInput });
    model.setGitStatus(treeInput.gitStatus);
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
    <FileTree
      className='gprv-tree'
      model={model}
      style={{ height: '100%' }}
    />
  );
}
