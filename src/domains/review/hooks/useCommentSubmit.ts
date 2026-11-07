import { useCallback, useEffect, useId, useRef, useState, type SubmitEvent } from 'react';

import { toErrorMessage } from '@/shared/errors';

type CommentSubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string };

type UseCommentSubmitOptions = {
  body: string;
  /** Returns a user-facing message that blocks submission, or null to proceed. */
  validate: (trimmedBody: string) => string | null;
  submit: (trimmedBody: string) => void | Promise<void>;
};

/**
 * Owns the submit lifecycle shared by every review composer: validation,
 * pending state, error message, and re-submit protection.
 *
 * The `<form>` is the source of truth for submission (see ReviewComposerForm),
 * so this hook only has to expose an `onSubmit` handler plus the state needed to
 * render pending/error UI.
 */
export function useCommentSubmit({ body, validate, submit }: UseCommentSubmitOptions) {
  const [state, setState] = useState<CommentSubmitState>({ status: 'idle' });
  const errorId = useId();
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmittingRef.current) {
        return;
      }

      const trimmedBody = body.trim();
      const validationError = validate(trimmedBody);
      if (validationError) {
        setState({ status: 'error', message: validationError });
        return;
      }

      isSubmittingRef.current = true;
      setState({ status: 'submitting' });

      void (async () => {
        try {
          await submit(trimmedBody);
          if (isMountedRef.current) {
            setState({ status: 'idle' });
          }
        } catch (error: unknown) {
          if (isMountedRef.current) {
            setState({ status: 'error', message: toErrorMessage(error) });
          }
        } finally {
          isSubmittingRef.current = false;
        }
      })();
    },
    [body, submit, validate],
  );

  /** Clears a stale error after the user edits the draft. */
  const reset = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    setState((current) => (current.status === 'error' ? { status: 'idle' } : current));
  }, []);

  return {
    errorId,
    error: state.status === 'error' ? state.message : null,
    isSubmitting: state.status === 'submitting',
    onSubmit,
    reset,
  };
}
