import { useMemo, type ReactNode } from 'react';

import { diffyChromeMapping } from '@/lib/theming/diffyChromeMapping';
import { useChromeThemeProps } from '@/providers/theming/useChromeThemeProps';
import { useThemeColorScheme } from '@/providers/theming/useThemeSelection';

type ChromeModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function ChromeModal({ title, children, onClose }: ChromeModalProps) {
  const colorScheme = useThemeColorScheme();
  const { style: chromeStyle } = useChromeThemeProps(diffyChromeMapping);
  const modalStyle = useMemo(
    () => ({
      ...chromeStyle,
      colorScheme,
    }),
    [chromeStyle, colorScheme],
  );

  return (
    <>
      <div
        className='gprv-backdrop'
        onClick={onClose}
      />
      <section
        className='gprv-modal'
        style={modalStyle}
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
