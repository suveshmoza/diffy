import { createRoot, type Root } from 'react-dom/client';

import { App } from '@/components/App';
import { PersistentWorkerPoolShell } from '@/components/PersistentWorkerPoolShell';
import { DiffThemeProvider } from '@/providers/DiffThemeProvider';
import { ResolvedThemeProvider } from '@/providers/ResolvedThemeProvider';

export type MountOverlayOptions = {
  container: HTMLElement;
  pullRequestUrl: string;
  onClose: () => void;
};

type OverlayRuntimeProps = {
  pullRequestUrl: string | null;
  onClose: () => void;
};

function OverlayRuntime({ pullRequestUrl, onClose }: OverlayRuntimeProps) {
  return (
    <DiffThemeProvider>
      <ResolvedThemeProvider>
        <PersistentWorkerPoolShell>
          {pullRequestUrl ? (
            <App
              key={pullRequestUrl}
              pullRequestUrl={pullRequestUrl}
              onClose={onClose}
            />
          ) : null}
        </PersistentWorkerPoolShell>
      </ResolvedThemeProvider>
    </DiffThemeProvider>
  );
}

let overlayRoot: Root | null = null;
let runtimeProps: OverlayRuntimeProps = {
  pullRequestUrl: null,
  onClose: () => undefined,
};

function renderOverlayRuntime(): void {
  overlayRoot?.render(<OverlayRuntime {...runtimeProps} />);
}

export function mountOverlay({ container, pullRequestUrl, onClose }: MountOverlayOptions): void {
  overlayRoot ??= createRoot(container);
  runtimeProps = { pullRequestUrl, onClose };
  renderOverlayRuntime();
}

/** Unmount app UI while keeping the worker pool shell alive in the React tree. */
export function unmountOverlayApp(): void {
  runtimeProps = { pullRequestUrl: null, onClose: runtimeProps.onClose };
  renderOverlayRuntime();
}

export function destroyOverlayRuntime(): void {
  overlayRoot?.unmount();
  overlayRoot = null;
  runtimeProps = { pullRequestUrl: null, onClose: () => undefined };
}
