import type { ReactNode } from 'react';

import type { GitHubTheme } from '@/lib/theme';

type ChromeModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  theme?: GitHubTheme;
};

export function ChromeModal({ title, children, onClose, theme }: ChromeModalProps) {
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
        aria-label={title}
      >
        <header className='gprv-header'>
          <div className='gprv-title'>
            <strong>{title}</strong>
          </div>
          <button
            className='gprv-close'
            type='button'
            onClick={onClose}
            aria-label='Close View Diff'
          >
            ✕
          </button>
        </header>
        {children}
      </section>
    </>
  );
}
