import type { ReactNode } from 'react';

import { useDiffThemeContext } from '@/providers/DiffThemeProvider';

type ChromeModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function ChromeModal({ title, children, onClose }: ChromeModalProps) {
  const { colorScheme } = useDiffThemeContext();

  return (
    <>
      <div
        className='gprv-backdrop'
        onClick={onClose}
      />
      <section
        className='gprv-modal'
        data-theme={colorScheme}
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
