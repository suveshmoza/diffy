import type { DiffLineAnnotation, LineAnnotation } from '@pierre/diffs';
import type { DiffsThemeNames } from '@pierre/diffs';
import { CodeView, WorkerPoolContextProvider, type CodeViewHandle } from '@pierre/diffs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { useDiffTheme } from '@/hooks/useDiffTheme';
import { buildCodeViewItems, getCodeViewItemIdForFile } from '@/lib/build-code-view-items';
import { buildCodeViewUnsafeCss } from '@/lib/code-view-unsafe-css';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff-layout-prefs';
import { diffThemeType } from '@/lib/diff-themes';
import { workerFactory } from '@/lib/diff-worker';
import type { PullRequestDiffData } from '@/lib/github';
import type { ReviewCommentThreadMetadata } from '@/lib/review-comments';

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
  const { theme, isReady: isThemeReady } = useDiffTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const chromeTheme = diffThemeType(theme);
  const [codeViewTheme, setCodeViewTheme] = useState<DiffsThemeNames | null>(null);
  const [codeViewUnsafeCss, setCodeViewUnsafeCss] = useState<string | null>(null);

  useEffect(() => {
    setCodeViewTheme(null);
    setCodeViewUnsafeCss(null);
  }, [theme]);

  const diffStyle = diffLayout === 'switched' ? ('split' as const) : ('unified' as const);
  const codeViewThemeType = codeViewTheme ? diffThemeType(codeViewTheme) : chromeTheme;
  const codeViewOptions = useMemo(() => {
    if (codeViewTheme == null || codeViewUnsafeCss == null) {
      return undefined;
    }

    return {
      theme: codeViewTheme,
      themeType: diffThemeType(codeViewTheme),
      diffStyle,
      overflow: 'wrap' as const,
      stickyHeaders: true,
      unsafeCSS: codeViewUnsafeCss,
      layout: { paddingTop: 0, paddingBottom: 0, gap: 0 },
    };
  }, [codeViewTheme, codeViewUnsafeCss, diffStyle]);

  const {
    items: initialItems,
    diffPathSet,
    reviewCommentCountByPath,
    orphanedReviewThreadsByItemId,
  } = useMemo(() => buildCodeViewItems(data), [data]);
  const isCodeViewHostReady = useCodeViewHostReady(codeViewHostRef);

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } =
    useCodeViewLayoutRefresh(viewerRef, codeViewHostRef, [
      initialItems,
      isSidebarCollapsed,
      codeViewTheme,
      isCodeViewHostReady,
    ]);

  const handleWorkerThemeSynced = useCallback((syncedTheme: DiffsThemeNames) => {
    if (syncedTheme !== themeRef.current) {
      return;
    }

    void buildCodeViewUnsafeCss(syncedTheme).then((unsafeCss) => {
      if (syncedTheme !== themeRef.current) {
        return;
      }

      setCodeViewUnsafeCss(unsafeCss);
      setCodeViewTheme(syncedTheme);
    });
  }, []);

  useEffect(() => {
    if (codeViewTheme == null || codeViewUnsafeCss == null) {
      return;
    }

    viewerRef.current?.getInstance()?.render(true);
    refreshCodeViewLayout();
  }, [codeViewTheme, codeViewUnsafeCss, refreshCodeViewLayout]);

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
        data-theme={chromeTheme}
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
                  theme={theme}
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
            {isThemeReady ? (
              <WorkerPoolContextProvider
                poolOptions={{
                  workerFactory,
                  poolSize: DIFF_WORKER_POOL_SIZE,
                  totalASTLRUCacheSize: DIFF_WORKER_RENDER_CACHE_SIZE,
                }}
                highlighterOptions={{ theme }}
              >
                <WorkerPoolRenderOptionsSync
                  theme={theme}
                  onSynced={handleWorkerThemeSynced}
                />
                {isCodeViewHostReady &&
                codeViewTheme != null &&
                codeViewUnsafeCss != null &&
                codeViewOptions != null ? (
                  <CodeView<ReviewCommentThreadMetadata>
                    key={codeViewTheme}
                    ref={viewerRef}
                    containerRef={handleCodeViewContainer}
                    initialItems={initialItems}
                    className='gprv-code-view'
                    style={{ height: '100%', colorScheme: codeViewThemeType }}
                    renderAnnotation={renderReviewAnnotation}
                    renderHeaderMetadata={renderReviewHeaderMetadata}
                    options={codeViewOptions}
                  />
                ) : (
                  <div className='gprv-state'>Preparing diff viewer…</div>
                )}
              </WorkerPoolContextProvider>
            ) : (
              <div className='gprv-state'>Preparing diff viewer…</div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
