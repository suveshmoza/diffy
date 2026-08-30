import { IconX } from '@pierre/icons';
import { useMemo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { diffyChromeMapping } from '@/lib/theming/diffyChromeMapping';
import { cn } from '@/lib/utils';
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
        className='fixed inset-0 z-[2147483647] bg-black/48'
        onClick={onClose}
      />
      <section
        className={cn(
          'fixed inset-0 z-[2147483647] grid grid-rows-[auto_1fr] overflow-hidden bg-background text-foreground',
          colorScheme === 'dark' && 'dark',
        )}
        style={modalStyle}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        <header className='flex min-h-14 items-center gap-3 border-b border-border px-4'>
          <div className='grid min-w-0 flex-1'>
            <strong className='truncate text-sm font-semibold leading-snug'>{title}</strong>
          </div>
          <Button
            variant='ghost'
            size='icon-sm'
            type='button'
            onClick={onClose}
            aria-label='Close View Diff'
          >
            <IconX />
          </Button>
        </header>
        {children}
      </section>
    </>
  );
}
