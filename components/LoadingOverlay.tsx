import { ChromeModal } from './ChromeModal';
import type { GitHubTheme } from '@/lib/theme';

type LoadingOverlayProps = {
  onClose: () => void;
  theme: GitHubTheme;
};

export function LoadingOverlay({ onClose, theme }: LoadingOverlayProps) {
  return (
    <ChromeModal title="Loading PR diff…" onClose={onClose} theme={theme}>
      <div className="gprv-modal-body gprv-modal-body-centered">
        <div className="gprv-loading-panel" role="status" aria-live="polite" aria-label="Loading pull request diff">
          <div className="gprv-loading-spinner" aria-hidden="true" />
          <p className="gprv-loading-summary">Fetching pull request metadata and changed files…</p>
          <p className="gprv-loading-hint">Large pull requests may take a few seconds.</p>
        </div>
      </div>
    </ChromeModal>
  );
}
