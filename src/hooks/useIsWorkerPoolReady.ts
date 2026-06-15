import { useRef } from 'react';

import { useDiffThemeContext } from '@/providers/DiffThemeProvider';
import { useWorkerPoolSyncedTheme } from '@/providers/WorkerPoolSyncedThemeContext';

/** True after worker pool has synced at least once; stays true across theme changes. */
export function useIsWorkerPoolReady(): boolean {
  const { theme } = useDiffThemeContext();
  const syncedTheme = useWorkerPoolSyncedTheme();
  const hasSyncedOnceRef = useRef(false);

  if (syncedTheme === theme) {
    hasSyncedOnceRef.current = true;
  }

  return hasSyncedOnceRef.current;
}
