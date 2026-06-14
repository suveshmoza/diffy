import { useDiffThemeContext } from '@/providers/DiffThemeProvider';
import { useWorkerPoolSyncedTheme } from '@/providers/WorkerPoolSyncedThemeContext';

/** True once worker pool render options match the active diff theme. */
export function useIsWorkerPoolReady(): boolean {
  const { theme } = useDiffThemeContext();
  const syncedTheme = useWorkerPoolSyncedTheme();
  return syncedTheme === theme;
}
