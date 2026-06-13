import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';
import { CodeView, type CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCodeViewItems } from '@/hooks/useCodeViewItems';
import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { useCodeViewThemeBootstrap } from '@/hooks/useCodeViewThemeBootstrap';
import { getCodeViewItemIdForFile } from '@/lib/build-code-view-items';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff-layout-prefs';
import type { PullRequestDiffData } from '@/lib/github';
import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';

import { DiffOverlayHeader } from './DiffOverlayHeader';
import { FileTreePanel } from './FileTreePanel';
import { OrphanedReviewCommentsBadge } from './OrphanedReviewCommentsBadge';
import { ReviewCommentThread } from './ReviewCommentThread';

type DiffOverlayProps = {
  data: PullRequestDiffData;
  onClose: () => void;
};

export function DiffOverlay({ data, onClose }: DiffOverlayProps) {
  const viewerRef = useRef<CodeViewHandle<ReviewCommentThreadMetadata>>(null);
  const codeViewHostRef = useRef<HTMLDivElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);

  useEffect(() => {
    let isCancelled = false;

    readDiffLayoutPreference()
      .then((storedLayout) => {
        if (!isCancelled) {
          setDiffLayout(storedLayout);
        }
      })
      .catch(() => {
        // Ignore preference read failures and keep the default layout.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const { isThemeReady, codeViewOptions, codeViewThemeType } = useCodeViewThemeBootstrap({
    diffLayout,
  });

  const { result: codeViewItems, isBuilding } = useCodeViewItems(data);
  const isCodeViewHostReady = useCodeViewHostReady(codeViewHostRef);
  const isCodeViewMounted = isCodeViewHostReady && isThemeReady && codeViewItems != null;

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } =
    useCodeViewLayoutRefresh(viewerRef, codeViewHostRef, [
      codeViewItems,
      isSidebarCollapsed,
      isCodeViewMounted,
      codeViewOptions,
    ]);

  useEffect(() => {
    if (!isCodeViewMounted || codeViewOptions == null) {
      return;
    }

    viewerRef.current?.getInstance()?.render(true);
    refreshCodeViewLayout();
  }, [codeViewOptions, isCodeViewMounted, refreshCodeViewLayout]);

  useEffect(() => {
    if (!isCodeViewMounted) {
      return;
    }

    refreshCodeViewLayout();
  }, [isCodeViewMounted, codeViewItems, refreshCodeViewLayout]);

  const codeViewStyle = useMemo(
    () => ({ height: '100%', colorScheme: codeViewThemeType }),
    [codeViewThemeType],
  );

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const updateDiffLayout = useCallback((nextLayout: DiffLayout) => {
    setDiffLayout(nextLayout);
    void writeDiffLayoutPreference(nextLayout);
  }, []);

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

      const id = getCodeViewItemIdForFile(file, codeViewItems.diffPathSet);
      viewerRef.current?.scrollTo({
        type: 'item',
        id,
        align: 'start',
        behavior: 'smooth',
      });
    },
    [codeViewItems],
  );

  const stopGitHubKeybindings = useCallback((event: React.KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  const renderReviewAnnotation = useCallback(
    (
      annotation:
        | LineAnnotation<ReviewCommentThreadMetadata>
        | DiffLineAnnotation<ReviewCommentThreadMetadata>,
    ) => <ReviewCommentThread annotation={annotation} />,
    [],
  );

  const renderReviewHeaderMetadata = useCallback(
    (item: NonNullable<typeof codeViewItems>['items'][number]) => {
      if (!codeViewItems) {
        return null;
      }

      const orphanedThreads = codeViewItems.orphanedReviewThreadsByItemId.get(item.id);
      if (!orphanedThreads?.length) {
        return null;
      }

      return <OrphanedReviewCommentsBadge threads={orphanedThreads} />;
    },
    [codeViewItems],
  );

  return (
    <>
      <div
        className='gprv-backdrop'
        onClick={onClose}
      />
      <section
        className='gprv-modal'
        data-theme={codeViewThemeType}
        role='dialog'
        aria-modal='true'
        aria-label='Pull request diff'
        onKeyDown={stopGitHubKeybindings}
        onKeyUp={stopGitHubKeybindings}
      >
        <DiffOverlayHeader
          pullRequest={data.pullRequest}
          diffLayout={diffLayout}
          isSidebarCollapsed={isSidebarCollapsed}
          reviewCommentsLoadError={data.reviewCommentsLoadError}
          onToggleSidebar={handleToggleSidebar}
          onDiffLayoutChange={updateDiffLayout}
          onClose={onClose}
        />

        <div className={`gprv-body${isSidebarCollapsed ? ' gprv-body-sidebar-collapsed' : ''}`}>
          {isSidebarCollapsed ? null : (
            <aside className='gprv-sidebar'>
              {data.files.length > 0 && codeViewItems ? (
                <FileTreePanel
                  files={data.files}
                  selectedPath={selectedPath}
                  reviewCommentCountByPath={codeViewItems.reviewCommentCountByPath}
                  onSelectPath={handleTreeSelect}
                />
              ) : (
                <div className='gprv-state'>
                  {isBuilding ? 'Building file list…' : 'No changed files found.'}
                </div>
              )}
            </aside>
          )}

          <div
            ref={codeViewHostRef}
            className='gprv-code-view-host'
          >
            {isCodeViewMounted && codeViewItems ? (
              <CodeView<ReviewCommentThreadMetadata>
                ref={viewerRef}
                containerRef={handleCodeViewContainer}
                initialItems={codeViewItems.items}
                className='gprv-code-view'
                style={codeViewStyle}
                renderAnnotation={renderReviewAnnotation}
                renderHeaderMetadata={renderReviewHeaderMetadata}
                options={codeViewOptions}
              />
            ) : (
              <div className='gprv-state'>
                {isBuilding ? 'Building diff…' : 'Preparing diff viewer…'}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
