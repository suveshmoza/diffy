import type { DiffsThemeNames } from '@pierre/diffs';
import { createContext, useContext } from 'react';

const WorkerPoolSyncedThemeContext = createContext<DiffsThemeNames | null>(null);

export function useWorkerPoolSyncedTheme(): DiffsThemeNames | null {
  return useContext(WorkerPoolSyncedThemeContext);
}

export const WorkerPoolSyncedThemeProvider = WorkerPoolSyncedThemeContext.Provider;
