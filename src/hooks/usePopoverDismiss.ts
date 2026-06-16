import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes an open popover when the user clicks outside of `containerRef` or
 * presses Escape. Listeners are only attached while `isOpen` is true.
 *
 * `onDismiss` is read through a ref so the effect does not re-subscribe when
 * callers pass an inline callback.
 */
export function usePopoverDismiss(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      onDismissRef.current();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismissRef.current();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, containerRef]);
}
