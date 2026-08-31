import { IconThemes } from '@pierre/icons';
import { useCallback, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { DisplaySettingsPanel } from './DisplaySettingsPanel';

/** Appearance (color mode + themes) popover for the overlay header toolbar. */
export function AppearanceSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label='Appearance settings'
            aria-haspopup='dialog'
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            title='Appearance'
          />
        }
      >
        <IconThemes size={12} />
      </PopoverTrigger>
      <PopoverContent
        id={panelId}
        align='end'
        className='w-80 gap-0 overflow-hidden p-0'
      >
        <DisplaySettingsPanel
          id={panelId}
          onClose={close}
          active={isOpen}
          scope='appearance'
        />
      </PopoverContent>
    </Popover>
  );
}
