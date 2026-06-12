import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';
import diffsBaseCSS from '@pierre/diffs/dist/style.js';
import { CodeView, WorkerPoolContextProvider, type CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { buildCodeViewItems, getCodeViewItemIdForFile } from '@/lib/build-code-view-items';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff-layout-prefs';
import { workerFactory } from '@/lib/diff-worker';
import type { PullRequestDiffData } from '@/lib/github';
import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';
import { getDiffTheme, getGitHubTheme, type GitHubTheme } from '@/lib/theme';

import { DiffOverlayHeader } from './DiffOverlayHeader';
import { FileTreePanel } from './FileTreePanel';
import { OrphanedReviewCommentsBadge } from './OrphanedReviewCommentsBadge';
import { ReviewCommentThread } from './ReviewCommentThread';
import { WorkerPoolRenderOptionsSync } from './WorkerPoolRenderOptionsSync';

type DiffOverlayProps = {
  data: PullRequestDiffData;
  onClose: () => void;
};

const DIFF_WORKER_POOL_SIZE = Math.max(
  1,
  Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
);
const DIFF_WORKER_RENDER_CACHE_SIZE = 200;

export function DiffOverlay({ data, onClose }: DiffOverlayProps) {
  const viewerRef = useRef<CodeViewHandle<ReviewCommentThreadMetadata>>(null);
  const codeViewHostRef = useRef<HTMLDivElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [theme, setTheme] = useState<GitHubTheme>(() => getGitHubTheme());

  const {
    items: initialItems,
    diffPathSet,
    reviewCommentCountByPath,
    orphanedReviewThreadsByItemId,
  } = useMemo(() => buildCodeViewItems(data), [data]);
  const diffTheme = getDiffTheme(theme);
  const isCodeViewHostReady = useCodeViewHostReady(codeViewHostRef);

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } =
    useCodeViewLayoutRefresh(viewerRef, codeViewHostRef, [
      initialItems,
      isSidebarCollapsed,
      diffTheme,
      isCodeViewHostReady,
    ]);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getGitHubTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-mode', 'class', 'style'],
    });
    return () => observer.disconnect();
  }, []);

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

  const handleTreeSelect = (path: string) => {
    setSelectedPath(path);
    const file = data.files.find((entry) => entry.filename === path);
    if (!file) {
      return;
    }

    const id = getCodeViewItemIdForFile(file, diffPathSet);
    viewerRef.current?.scrollTo({ type: 'item', id, align: 'start' });
  };

  const updateDiffLayout = (nextLayout: DiffLayout) => {
    setDiffLayout(nextLayout);
    void writeDiffLayoutPreference(nextLayout);
  };

  useEffect(() => {
    refreshCodeViewLayout();
  }, [refreshCodeViewLayout, initialItems]);

  const stopGitHubKeybindings = (event: React.KeyboardEvent) => {
    event.stopPropagation();
  };

  const renderReviewAnnotation = useCallback(
    (
      annotation:
        | LineAnnotation<ReviewCommentThreadMetadata>
        | DiffLineAnnotation<ReviewCommentThreadMetadata>,
    ) => <ReviewCommentThread annotation={annotation} />,
    [],
  );

  const renderReviewHeaderMetadata = useCallback(
    (item: (typeof initialItems)[number]) => {
      const orphanedThreads = orphanedReviewThreadsByItemId.get(item.id);
      if (!orphanedThreads?.length) {
        return null;
      }

      return <OrphanedReviewCommentsBadge threads={orphanedThreads} />;
    },
    [orphanedReviewThreadsByItemId],
  );

  return (
    <>
      <div
        className='gprv-backdrop'
        onClick={onClose}
      />
      <section
        className='gprv-modal'
        data-theme={theme}
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
          onToggleSidebar={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          onDiffLayoutChange={updateDiffLayout}
          onClose={onClose}
        />

        <div className={`gprv-body${isSidebarCollapsed ? ' gprv-body-sidebar-collapsed' : ''}`}>
          {isSidebarCollapsed ? null : (
            <aside className='gprv-sidebar'>
              {data.files.length > 0 ? (
                <FileTreePanel
                  files={data.files}
                  selectedPath={selectedPath}
                  reviewCommentCountByPath={reviewCommentCountByPath}
                  onSelectPath={handleTreeSelect}
                />
              ) : (
                <div className='gprv-state'>No changed files found.</div>
              )}
            </aside>
          )}

          <div
            ref={codeViewHostRef}
            className='gprv-code-view-host'
          >
            <WorkerPoolContextProvider
              poolOptions={{
                workerFactory,
                poolSize: DIFF_WORKER_POOL_SIZE,
                totalASTLRUCacheSize: DIFF_WORKER_RENDER_CACHE_SIZE,
              }}
              highlighterOptions={{ theme: diffTheme }}
            >
              <WorkerPoolRenderOptionsSync
                theme={diffTheme}
                onSynced={refreshCodeViewLayout}
              />
              {isCodeViewHostReady ? (
                <CodeView<ReviewCommentThreadMetadata>
                  ref={viewerRef}
                  containerRef={handleCodeViewContainer}
                  initialItems={initialItems}
                  className='gprv-code-view'
                  style={{ height: '100%' }}
                  renderAnnotation={renderReviewAnnotation}
                  renderHeaderMetadata={renderReviewHeaderMetadata}
                  options={{
                    theme: { dark: 'pierre-dark', light: 'pierre-light' },
                    themeType: theme,
                    diffStyle: diffLayout === 'switched' ? 'split' : 'unified',
                    stickyHeaders: true,
                    unsafeCSS: diffsBaseCSS,
                    layout: { paddingTop: 0, paddingBottom: 0, gap: 16 },
                  }}
                />
              ) : (
                <div className='gprv-state'>Preparing diff viewer…</div>
              )}
            </WorkerPoolContextProvider>
          </div>
        </div>
      </section>
    </>
  );
}
