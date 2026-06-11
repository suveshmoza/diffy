import { useEffect, useMemo, useRef, useState } from 'react';
import diffsBaseCSS from '@pierre/diffs/dist/style.js';
import { CodeView, WorkerPoolContextProvider, type CodeViewHandle } from '@pierre/diffs/react';
import { buildCodeViewItems, getCodeViewItemIdForFile } from '@/lib/build-code-view-items';
import {
  DEFAULT_DIFF_LAYOUT,
  readDiffLayoutPreference,
  writeDiffLayoutPreference,
  type DiffLayout,
} from '@/lib/diff-layout-prefs';
import { workerFactory } from '@/lib/diff-worker';
import type { PullRequestDiffData } from '@/lib/github';
import { getDiffTheme, getGitHubTheme, type GitHubTheme } from '@/lib/theme';
import { useCodeViewHostReady, useCodeViewLayoutRefresh } from '@/hooks/useCodeViewLayoutRefresh';
import { FileTreePanel } from './FileTreePanel';
import { WorkerPoolRenderOptionsSync } from './WorkerPoolRenderOptionsSync';

type DiffOverlayProps = {
  data: PullRequestDiffData;
  onClose: () => void;
};

const DIFF_WORKER_POOL_SIZE = Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)));
const DIFF_WORKER_RENDER_CACHE_SIZE = 200;

export function DiffOverlay({ data, onClose }: DiffOverlayProps) {
  const viewerRef = useRef<CodeViewHandle<undefined>>(null);
  const codeViewHostRef = useRef<HTMLDivElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [diffLayout, setDiffLayout] = useState<DiffLayout>(DEFAULT_DIFF_LAYOUT);
  const [theme, setTheme] = useState<GitHubTheme>(() => getGitHubTheme());

  const { items: initialItems, diffPathSet } = useMemo(() => buildCodeViewItems(data), [data]);
  const diffTheme = getDiffTheme(theme);
  const isCodeViewHostReady = useCodeViewHostReady(codeViewHostRef);

  const { containerRef: handleCodeViewContainer, refresh: refreshCodeViewLayout } = useCodeViewLayoutRefresh(
    viewerRef,
    codeViewHostRef,
    [initialItems, diffLayout, isSidebarCollapsed, diffTheme, isCodeViewHostReady],
  );

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

    readDiffLayoutPreference().then((storedLayout) => {
      if (!isCancelled) {
        setDiffLayout(storedLayout);
      }
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

  return (
    <>
      <div className="gprv-backdrop" onClick={onClose} />
      <section className="gprv-modal" data-theme={theme} role="dialog" aria-modal="true" aria-label="Pull request diff">
        <header className="gprv-header">
          <div className="gprv-title">
            <strong>{data.pullRequest.title}</strong>
            <span>
              {data.pullRequest.base.repo.full_name} #{data.pullRequest.number} · {data.pullRequest.base.ref} ←{' '}
              {data.pullRequest.head.ref}
            </span>
          </div>
          <button className="gprv-header-button" type="button" onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}>
            {isSidebarCollapsed ? 'Show files' : 'Hide files'}
          </button>
          <DiffLayoutToggle value={diffLayout} onChange={updateDiffLayout} />
          <button className="gprv-close" type="button" onClick={onClose} aria-label="Close View Diff">
            ✕
          </button>
        </header>

        <div className={`gprv-body${isSidebarCollapsed ? ' gprv-body-sidebar-collapsed' : ''}`}>
          {isSidebarCollapsed ? null : (
            <aside className="gprv-sidebar">
              <div className="gprv-summary">
                <span>{data.pullRequest.changed_files} files changed</span>
                <span>
                  +{data.pullRequest.additions} / -{data.pullRequest.deletions}
                </span>
              </div>
              {data.files.length > 0 ? (
                <FileTreePanel files={data.files} selectedPath={selectedPath} onSelectPath={handleTreeSelect} />
              ) : (
                <div className="gprv-state">No changed files found.</div>
              )}
            </aside>
          )}

          <div ref={codeViewHostRef} className="gprv-code-view-host">
            <WorkerPoolContextProvider
              poolOptions={{
                workerFactory,
                poolSize: DIFF_WORKER_POOL_SIZE,
                totalASTLRUCacheSize: DIFF_WORKER_RENDER_CACHE_SIZE,
              }}
              highlighterOptions={{ theme: diffTheme }}
            >
              <WorkerPoolRenderOptionsSync theme={diffTheme} onSynced={refreshCodeViewLayout} />
              {isCodeViewHostReady ? (
                <CodeView
                  ref={viewerRef}
                  containerRef={handleCodeViewContainer}
                  initialItems={initialItems}
                  className="gprv-code-view"
                  style={{ height: '100%' }}
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
                <div className="gprv-state">Preparing diff viewer…</div>
              )}
            </WorkerPoolContextProvider>
          </div>
        </div>
      </section>
    </>
  );
}

function DiffLayoutToggle({ value, onChange }: { value: DiffLayout; onChange: (layout: DiffLayout) => void }) {
  return (
    <div className="gprv-layout-toggle" role="group" aria-label="Diff layout">
      <button type="button" data-active={value === 'switched' ? '' : undefined} onClick={() => onChange('switched')}>
        Switched
      </button>
      <button type="button" data-active={value === 'stacked' ? '' : undefined} onClick={() => onChange('stacked')}>
        Stacked
      </button>
    </div>
  );
}
