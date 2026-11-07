import type { SubmitEvent, KeyboardEvent, ReactNode } from 'react';

type ReviewComposerFormProps = {
  className?: string;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: ReactNode;
};

/**
 * Semantic form wrapper for every review composer. Centralizes the keyboard
 * contract: Escape cancels, Cmd/Ctrl+Enter submits, and composer keystrokes do
 * not reach the overlay's global shortcuts.
 */
export function ReviewComposerForm({
  className,
  onSubmit,
  onCancel,
  children,
}: ReviewComposerFormProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  return (
    <form
      className={className}
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
    >
      {children}
    </form>
  );
}
