const SCROLL_LOCK_CLASS = 'gprv-scroll-locked';

type SavedScrollLockState = {
  scrollX: number;
  scrollY: number;
  bodyTop: string;
  bodyPaddingRight: string;
};

let lockCount = 0;
let savedState: SavedScrollLockState | null = null;

/** Freeze github.com page scroll while the diff overlay is open. */
export function lockPageScroll(): void {
  lockCount += 1;
  if (lockCount > 1) {
    return;
  }

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  savedState = {
    scrollX,
    scrollY,
    bodyTop: document.body.style.top,
    bodyPaddingRight: document.body.style.paddingRight,
  };

  document.documentElement.classList.add(SCROLL_LOCK_CLASS);
  document.body.style.top = `-${scrollY}px`;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

/** Restore github.com page scroll after the diff overlay closes. */
export function unlockPageScroll(): void {
  if (lockCount === 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount > 0) {
    return;
  }

  const state = savedState;
  savedState = null;
  if (!state) {
    return;
  }

  document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
  document.body.style.top = state.bodyTop;
  document.body.style.paddingRight = state.bodyPaddingRight;
  window.scrollTo(state.scrollX, state.scrollY);
}
