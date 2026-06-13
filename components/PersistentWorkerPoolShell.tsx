import { WorkerPoolContextProvider } from '@pierre/diffs/react';
import { useMemo, type ReactNode } from 'react';

import { workerFactory } from '@/lib/diff-worker';
import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

import { WorkerPoolRenderOptionsSync } from './WorkerPoolRenderOptionsSync';

const DIFF_WORKER_POOL_SIZE = Math.max(
  1,
  Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
);
const DIFF_WORKER_RENDER_CACHE_SIZE = 200;
const DIFF_WORKER_LANGS = [
  'python',
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'java',
  'csharp',
  'cpp',
  'c',
  'go',
  'php',
  'shell',
  'rust',
  'ruby',
  'kotlin',
  'swift',
  'scala',
  'dart',
  'dockerfile',
  'terraform',
  'json',
  'yaml',
  'markdown',
  'sql',
  'html',
  'css',
  'scss',
  'vue',
  'xml',
  'powershell',
] as const;

type PersistentWorkerPoolShellProps = {
  children: ReactNode;
};

export function PersistentWorkerPoolShell({ children }: PersistentWorkerPoolShellProps) {
  const { theme } = useDiffThemeContext();

  const poolOptions = useMemo(
    () => ({
      workerFactory,
      poolSize: DIFF_WORKER_POOL_SIZE,
      totalASTLRUCacheSize: DIFF_WORKER_RENDER_CACHE_SIZE,
    }),
    [],
  );

  const highlighterOptions = useMemo(
    () => ({
      theme,
      langs: [...DIFF_WORKER_LANGS],
    }),
    [theme],
  );

  return (
    <WorkerPoolContextProvider
      poolOptions={poolOptions}
      highlighterOptions={highlighterOptions}
    >
      <WorkerPoolRenderOptionsSync theme={theme} />
      {children}
    </WorkerPoolContextProvider>
  );
}
