import { IconEye, IconPencil } from '@pierre/icons';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react';

import type { GitHubPullRequestRef } from '@/domains/github/api';
import { useReviewOptional } from '@/domains/review/providers/ReviewContext';
import { cn } from '@/shared/utils';

import { ReviewCommentBody } from './ReviewCommentBody';

type ComposerMode = 'write' | 'preview';

const MODE_OPTIONS = [
  {
    value: 'write' as const,
    label: 'Write',
    icon: <IconPencil size={16} />,
  },
  {
    value: 'preview' as const,
    label: 'Preview',
    icon: <IconEye size={16} />,
  },
] as const;

function modeToggleButtonClassName(isSelected: boolean, isFirst: boolean, isLast: boolean) {
  return cn(
    'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border border-input px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
    isFirst && 'rounded-l-lg',
    isLast && 'rounded-r-lg',
    !isFirst && 'border-l-0',
    isSelected
      ? 'bg-background text-foreground shadow-sm'
      : 'bg-transparent text-foreground hover:bg-muted/70',
  );
}

type ReviewMarkdownComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  pullRequestRef?: GitHubPullRequestRef;
};

export const ReviewMarkdownComposer = forwardRef(function ReviewMarkdownComposer(
  {
    value,
    onChange,
    onKeyDown,
    placeholder,
    rows = 3,
    disabled = false,
    id,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    pullRequestRef: pullRequestRefProp,
  }: ReviewMarkdownComposerProps,
  ref: Ref<HTMLTextAreaElement>,
) {
  const reviewContext = useReviewOptional();
  const pullRequestRef = pullRequestRefProp ?? reviewContext?.meta.pullRequestRef;
  const [mode, setMode] = useState<ComposerMode>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const handleModeChange = useCallback((next: ComposerMode) => {
    setMode(next);
  }, []);

  useEffect(() => {
    if (mode !== 'write') {
      return;
    }
    textareaRef.current?.focus({ preventScroll: true });
  }, [mode]);

  return (
    <div className='grid gap-2'>
      <div className='flex items-center'>
        <div
          role='group'
          aria-label='Comment editor mode'
          className='inline-flex w-fit rounded-lg'
        >
          {MODE_OPTIONS.map((option, index) => {
            const isSelected = mode === option.value;
            return (
              <button
                key={option.value}
                type='button'
                aria-pressed={isSelected}
                disabled={disabled}
                title={option.label}
                onClick={() => handleModeChange(option.value)}
                className={modeToggleButtonClassName(
                  isSelected,
                  index === 0,
                  index === MODE_OPTIONS.length - 1,
                )}
              >
                <span className='inline-flex items-center gap-1.5'>
                  <span
                    className='inline-flex shrink-0'
                    aria-hidden='true'
                  >
                    {option.icon}
                  </span>
                  <span>{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {mode === 'write' ? (
        <textarea
          ref={setTextareaRef}
          id={id}
          className='flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      ) : (
        <div className='flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm'>
          <ReviewCommentBody
            body={value}
            pullRequestRef={pullRequestRef}
          />
        </div>
      )}
    </div>
  );
});
