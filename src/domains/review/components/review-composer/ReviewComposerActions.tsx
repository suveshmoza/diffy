import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils';

type ReviewComposerActionsProps = {
  error: string | null;
  errorId: string;
  tokenHint: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onCancel: () => void;
  /** The edit composer keeps its own spacing before these rows. */
  hintSpacing?: boolean;
};

/** Token hint, error message, and Cancel/Submit footer shared by all composers. */
export function ReviewComposerActions({
  error,
  errorId,
  tokenHint,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onCancel,
  hintSpacing = true,
}: ReviewComposerActionsProps) {
  return (
    <>
      {tokenHint ? (
        <p className={cn('text-xs text-muted-foreground', hintSpacing && 'mt-2')}>{tokenHint}</p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role='alert'
          className={cn('text-xs text-destructive', hintSpacing && 'mt-2')}
        >
          {error}
        </p>
      ) : null}
      <div className='mt-2.5 flex flex-wrap justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type='submit'
          size='sm'
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </>
  );
}
