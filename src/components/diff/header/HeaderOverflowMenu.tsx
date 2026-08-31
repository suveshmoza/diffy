import { IconArrowUpRight, IconGearFill, IconGlobe, IconRefresh } from '@pierre/icons';
import { useCallback, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { CodeViewDisplayPrefs } from '@/lib/diff/display-prefs';
import { cn } from '@/lib/utils';

import { DisplaySettingsPanel } from './DisplaySettingsPanel';
import { OverflowMenuItem, OverflowMenuSection } from './overflowMenuUi';

type HeaderOverflowMenuProps = {
  displayPrefs: CodeViewDisplayPrefs;
  onDisplayPrefsChange: (partial: Partial<CodeViewDisplayPrefs>) => void;
  isRefreshing: boolean;
  canRefresh: boolean;
  canOpenInNewTab: boolean;
  onRefresh?: () => void;
  onOpenInNewTab: () => void;
};

export function HeaderOverflowMenu({
  displayPrefs,
  onDisplayPrefsChange,
  isRefreshing,
  canRefresh,
  canOpenInNewTab,
  onRefresh,
  onOpenInNewTab,
}: HeaderOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const settingsPanelId = `${menuId}-display-settings`;

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const runAction = useCallback(
    (action: () => void) => {
      action();
      close();
    },
    [close],
  );

  const hasSessionActions = canRefresh || canOpenInNewTab;

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
            aria-label='More header actions'
            aria-haspopup='menu'
            aria-expanded={isOpen}
            aria-controls={isOpen ? menuId : undefined}
            title='More'
          />
        }
      >
        <IconGearFill />
      </PopoverTrigger>

      <PopoverContent
        id={menuId}
        align='end'
        side='bottom'
        className='w-80 gap-0 overflow-hidden p-0'
      >
        <div className='max-h-[min(70vh,480px)] overflow-y-auto overscroll-contain'>
          <div className='flex flex-col gap-1 p-1'>
            {hasSessionActions ? (
              <>
                <OverflowMenuSection
                  label='Session'
                  icon={<IconGlobe size={14} />}
                >
                  {canRefresh ? (
                    <OverflowMenuItem
                      icon={
                        <IconRefresh
                          size={12}
                          className={cn(isRefreshing && 'animate-spin')}
                        />
                      }
                      label={isRefreshing ? 'Refreshing…' : 'Refresh pull request'}
                      disabled={isRefreshing}
                      onClick={() => runAction(() => onRefresh?.())}
                    />
                  ) : null}
                  {canOpenInNewTab ? (
                    <OverflowMenuItem
                      icon={<IconArrowUpRight size={12} />}
                      label='Open in new tab'
                      onClick={() => runAction(onOpenInNewTab)}
                    />
                  ) : null}
                </OverflowMenuSection>
                <Separator className='my-1' />
              </>
            ) : null}

            <DisplaySettingsPanel
              id={settingsPanelId}
              displayPrefs={displayPrefs}
              onChange={onDisplayPrefsChange}
              onClose={close}
              active={isOpen}
              embedded
              scope='display'
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
