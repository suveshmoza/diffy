import type { CodeViewHandle } from '@pierre/diffs/react';

type CodeViewScrollAnchorInstance = {
  capturePendingLayoutAnchor?: () => void;
  getContainerElement?: () => HTMLElement | null;
  scrollTo?: (target: { type: 'position'; position: number; behavior: 'instant' }) => void;
};

function restoreScrollIfJumped(
  instance: CodeViewScrollAnchorInstance | undefined,
  scrollBefore: number,
): void {
  const scrollRoot = instance?.getContainerElement?.();
  if (!scrollRoot || Math.abs(scrollRoot.scrollTop - scrollBefore) <= 2) {
    return;
  }

  instance?.scrollTo?.({
    type: 'position',
    position: scrollBefore,
    behavior: 'instant',
  });
}

function scheduleScrollRestore(
  instance: CodeViewScrollAnchorInstance | undefined,
  scrollBefore: number,
  after?: () => void,
): void {
  requestAnimationFrame(() => {
    restoreScrollIfJumped(instance, scrollBefore);
    requestAnimationFrame(() => {
      restoreScrollIfJumped(instance, scrollBefore);
      after?.();
    });
  });
}

export function updateCodeViewItemPreservingScroll<TMetadata>(
  viewer: CodeViewHandle<TMetadata>,
  update: () => boolean,
): boolean {
  const instance = viewer.getInstance() as CodeViewScrollAnchorInstance | undefined;
  const scrollBefore = instance?.getContainerElement?.()?.scrollTop ?? null;

  instance?.capturePendingLayoutAnchor?.();
  const updated = update();

  if (scrollBefore != null) {
    scheduleScrollRestore(instance, scrollBefore);
  }

  return updated;
}

export function runCodeViewMutationPreservingScroll<TMetadata>(
  viewer: CodeViewHandle<TMetadata>,
  mutate: () => void,
  after?: () => void,
): void {
  const instance = viewer.getInstance() as CodeViewScrollAnchorInstance | undefined;
  const scrollBefore = instance?.getContainerElement?.()?.scrollTop ?? null;

  instance?.capturePendingLayoutAnchor?.();
  mutate();

  if (scrollBefore != null) {
    scheduleScrollRestore(instance, scrollBefore, after);
  } else {
    after?.();
  }
}

/** Defer controlled React state that syncs back into CodeView until scroll is restored. */
export function deferCodeViewControlledSync<TMetadata>(
  viewer: CodeViewHandle<TMetadata> | null | undefined,
  sync: () => void,
): void {
  if (!viewer) {
    sync();
    return;
  }

  runCodeViewMutationPreservingScroll(viewer, () => {}, sync);
}
