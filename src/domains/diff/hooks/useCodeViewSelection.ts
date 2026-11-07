import type { CodeViewLineSelection } from '@pierre/diffs';
import { useStableCallback, type CodeViewHandle } from '@pierre/diffs/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';

import type { CodeViewItemsResult } from '@/domains/code-view/model/build-items';
import { getCodeViewItemIdForFile } from '@/domains/code-view/model/build-items';
import { getItemPath, type ReviewAnnotationMetadata } from '@/domains/code-view/model/comments';
import { deferCodeViewControlledSync } from '@/domains/code-view/model/scroll-anchor';
import { bumpImageDiffPriority } from '@/domains/diff/media/image-diff-cache';
import { MOBILE_SIDEBAR_QUERY } from '@/domains/diff/providers/SidebarContext';
import type { GitHubPullRequest, GitHubPullRequestRef } from '@/domains/github/api';
import { hasAnyDraftAnnotation } from '@/domains/review/model/review-mutations';

type UseCodeViewSelectionParams = {
  viewerRef: RefObject<CodeViewHandle<ReviewAnnotationMetadata, undefined> | null>;
  codeViewItems: CodeViewItemsResult | null;
  itemById: Map<string, CodeViewItemsResult['items'][number]> | undefined;
  pullRequestRef: GitHubPullRequestRef;
  pullRequest: GitHubPullRequest;
  closeSidebar: () => void;
};

export function useCodeViewSelection({
  viewerRef,
  codeViewItems,
  itemById,
  pullRequestRef,
  pullRequest,
  closeSidebar,
}: UseCodeViewSelectionParams): {
  selectedPath: string | null;
  setSelectedPath: Dispatch<SetStateAction<string | null>>;
  selectedLines: CodeViewLineSelection | null;
  setSelectedLines: Dispatch<SetStateAction<CodeViewLineSelection | null>>;
  hoveredThreadSelection: CodeViewLineSelection | null;
  setHoveredThreadSelection: Dispatch<SetStateAction<CodeViewLineSelection | null>>;
  selectedLinesRef: RefObject<CodeViewLineSelection | null>;
  hoveredThreadSelectionRef: RefObject<CodeViewLineSelection | null>;
  isOpeningDraftRef: RefObject<boolean>;
  handleTreeSelect: (path: string) => void;
  handleSelectedLinesChange: (selection: CodeViewLineSelection | null) => void;
  handleThreadHighlight: (selection: CodeViewLineSelection) => void;
  handleThreadHighlightClear: () => void;
} {
  const selectedLinesRef = useRef<CodeViewLineSelection | null>(null);
  const hoveredThreadSelectionRef = useRef<CodeViewLineSelection | null>(null);
  const isOpeningDraftRef = useRef(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<CodeViewLineSelection | null>(null);
  const [hoveredThreadSelection, setHoveredThreadSelection] =
    useState<CodeViewLineSelection | null>(null);

  useEffect(() => {
    selectedLinesRef.current = selectedLines;
  }, [selectedLines]);

  useEffect(() => {
    hoveredThreadSelectionRef.current = hoveredThreadSelection;
  }, [hoveredThreadSelection]);

  const handleTreeSelect = useCallback(
    (path: string) => {
      if (!codeViewItems) {
        return;
      }

      setSelectedPath(path);
      const file = codeViewItems.fileByPath.get(path);
      if (!file) {
        return;
      }

      bumpImageDiffPriority(pullRequestRef, pullRequest, file);
      const id = getCodeViewItemIdForFile(file, codeViewItems.diffPathSet);
      viewerRef.current?.scrollTo({
        type: 'item',
        id,
        align: 'start',
        behavior: 'smooth',
      });

      if (window.matchMedia(MOBILE_SIDEBAR_QUERY).matches) {
        closeSidebar();
      }
    },
    [closeSidebar, codeViewItems, pullRequest, pullRequestRef, viewerRef],
  );

  const handleSelectedLinesChange = useStableCallback((selection: CodeViewLineSelection | null) => {
    const viewer = viewerRef.current;
    if (
      selection == null &&
      viewer &&
      codeViewItems &&
      hasAnyDraftAnnotation(viewer, codeViewItems.items)
    ) {
      return;
    }

    if (selection == null && hoveredThreadSelectionRef.current != null) {
      return;
    }

    // openDraftComposer runs first on gutter + clicks and defers selection sync itself.
    if (selection != null && isOpeningDraftRef.current) {
      return;
    }

    const applySelectionState = () => {
      if (selection != null) {
        setHoveredThreadSelection(null);
      }

      setSelectedLines(selection);
      if (!selection || !itemById) {
        return;
      }

      const item = itemById.get(selection.id);
      if (!item) {
        return;
      }

      const path = getItemPath(item);
      setSelectedPath((current) => (current === path ? current : path));
    };

    if (selection != null && viewer) {
      deferCodeViewControlledSync(viewer, applySelectionState);
      return;
    }

    applySelectionState();
  });

  const handleThreadHighlight = useStableCallback((selection: CodeViewLineSelection) => {
    setHoveredThreadSelection(selection);
  });

  const handleThreadHighlightClear = useStableCallback(() => {
    setHoveredThreadSelection(null);
  });

  return {
    selectedPath,
    setSelectedPath,
    selectedLines,
    setSelectedLines,
    hoveredThreadSelection,
    setHoveredThreadSelection,
    selectedLinesRef,
    hoveredThreadSelectionRef,
    isOpeningDraftRef,
    handleTreeSelect,
    handleSelectedLinesChange,
    handleThreadHighlight,
    handleThreadHighlightClear,
  };
}
