import { IconSearch, IconX } from '@pierre/icons';
import { type KeyboardEvent, type RefObject } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/utils';

const countFormatter = new Intl.NumberFormat('en');

type FileTreeSearchHeaderProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  matchingPaths: readonly string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

export function FileTreeSearchHeader({
  inputRef,
  matchingPaths,
  searchQuery,
  onSearchQueryChange,
}: FileTreeSearchHeaderProps) {
  const hasQuery = searchQuery.trim().length > 0;
  const matchCount = matchingPaths.length;

  const matchSummary =
    matchCount === 0
      ? 'No matching files'
      : `${countFormatter.format(matchCount)} matching ${matchCount === 1 ? 'file' : 'files'}`;

  // Keep keystrokes away from GitHub's own shortcuts. Done on bubble (not capture) so the
  // input's own onKeyDown below still runs first.
  const stopGitHubKeybindings = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    // First Escape clears the filter, second one leaves the field.
    if (hasQuery) {
      onSearchQueryChange('');
    } else {
      event.currentTarget.blur();
    }
  };

  const clear = () => {
    onSearchQueryChange('');
    // The clear button unmounts, so hand focus back to the input instead of dropping it.
    inputRef.current?.focus();
  };

  return (
    <div
      role='search'
      className='flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar px-3 py-2 mb-1'
      onKeyDown={stopGitHubKeybindings}
      onKeyUp={stopGitHubKeybindings}
    >
      <div className='group relative'>
        <IconSearch
          size={13}
          className='pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground'
        />
        <Input
          ref={inputRef}
          className={cn('h-7 bg-secondary pl-7 text-xs', hasQuery ? 'pr-14' : 'pr-7')}
          type='text'
          inputMode='search'
          autoComplete='off'
          spellCheck={false}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Search files'
          aria-label='Filter changed files'
        />

        {hasQuery ? (
          <div className='absolute top-1/2 right-0.5 flex -translate-y-1/2 items-center'>
            <span
              className={cn(
                'pointer-events-none px-1 text-[11px] leading-5 tabular-nums',
                matchCount === 0 ? 'text-destructive' : 'text-muted-foreground',
              )}
              title={matchSummary}
              aria-hidden='true'
            >
              {countFormatter.format(matchCount)}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              className='size-5 text-muted-foreground [&_svg]:size-3'
              aria-label='Clear filter'
              onClick={clear}
            >
              <IconX />
            </Button>
          </div>
        ) : null}
      </div>

      <p
        role='status'
        className='sr-only'
      >
        {hasQuery ? matchSummary : ''}
      </p>
    </div>
  );
}
