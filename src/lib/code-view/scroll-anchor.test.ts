import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  deferCodeViewControlledSync,
  runCodeViewMutationPreservingScroll,
  updateCodeViewItemPreservingScroll,
} from './scroll-anchor';

function makeEl(scrollTop = 0) {
  return { scrollTop };
}

function makeInstance(el: { scrollTop: number }) {
  return {
    scrollTo: vi.fn(),
    getContainerElement: vi.fn().mockReturnValue(el),
    capturePendingLayoutAnchor: vi.fn(),
  };
}

function makeViewer(instance: ReturnType<typeof makeInstance> | undefined) {
  return { getInstance: vi.fn().mockReturnValue(instance) } as never;
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    cb();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('updateCodeViewItemPreservingScroll', () => {
  it('captures layout anchor, runs update, restores scroll', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);
    const update = vi.fn().mockImplementation(() => {
      el.scrollTop = 50;
      return true;
    });

    const result = updateCodeViewItemPreservingScroll(viewer, update);

    expect(result).toBe(true);
    expect(inst.capturePendingLayoutAnchor).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(inst.scrollTo).toHaveBeenCalledWith({
      type: 'position',
      position: 100,
      behavior: 'instant',
    });
  });

  it('does not restore scroll when position unchanged', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);

    updateCodeViewItemPreservingScroll(viewer, vi.fn().mockReturnValue(true));

    expect(inst.scrollTo).not.toHaveBeenCalled();
  });

  it('does not restore scroll when scrollTop diff <= 2', () => {
    const el = makeEl(0);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);
    const update = vi.fn().mockImplementation(() => {
      el.scrollTop = 1;
      return true;
    });

    updateCodeViewItemPreservingScroll(viewer, update);

    expect(inst.scrollTo).not.toHaveBeenCalled();
  });

  it('restores scroll when scrollTop diff > 2', () => {
    const el = makeEl(0);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);
    const update = vi.fn().mockImplementation(() => {
      el.scrollTop = 10;
      return true;
    });

    updateCodeViewItemPreservingScroll(viewer, update);

    expect(inst.scrollTo).toHaveBeenCalledWith({
      type: 'position',
      position: 0,
      behavior: 'instant',
    });
  });

  it('returns false when update returns false', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);

    const result = updateCodeViewItemPreservingScroll(viewer, vi.fn().mockReturnValue(false));

    expect(result).toBe(false);
  });

  it('does nothing when instance is undefined', () => {
    const viewer = makeViewer(undefined);
    const update = vi.fn().mockReturnValue(true);

    const result = updateCodeViewItemPreservingScroll(viewer, update);

    expect(result).toBe(true);
    expect(update).toHaveBeenCalledOnce();
  });

  it('does nothing when getContainerElement returns null', () => {
    const inst = makeInstance(makeEl(0));
    inst.getContainerElement.mockReturnValue(null);
    const viewer = makeViewer(inst);
    const update = vi.fn().mockReturnValue(true);

    const result = updateCodeViewItemPreservingScroll(viewer, update);

    expect(result).toBe(true);
    expect(update).toHaveBeenCalledOnce();
    expect(inst.scrollTo).not.toHaveBeenCalled();
  });

  it('calls capturePendingLayoutAnchor even without container', () => {
    const inst = makeInstance(makeEl(0));
    inst.getContainerElement.mockReturnValue(null);
    const viewer = makeViewer(inst);

    updateCodeViewItemPreservingScroll(viewer, vi.fn().mockReturnValue(true));

    expect(inst.capturePendingLayoutAnchor).toHaveBeenCalledOnce();
  });
});

describe('runCodeViewMutationPreservingScroll', () => {
  it('runs mutation and restores scroll', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);
    const mutate = vi.fn().mockImplementation(() => {
      el.scrollTop = 50;
    });

    runCodeViewMutationPreservingScroll(viewer, mutate);

    expect(inst.capturePendingLayoutAnchor).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledOnce();
    expect(inst.scrollTo).toHaveBeenCalledWith({
      type: 'position',
      position: 100,
      behavior: 'instant',
    });
  });

  it('calls after callback after scroll restoration', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);
    const after = vi.fn();
    const mutate = vi.fn().mockImplementation(() => {
      el.scrollTop = 50;
    });

    runCodeViewMutationPreservingScroll(viewer, mutate, after);

    expect(after).toHaveBeenCalledOnce();
  });

  it('calls after synchronously when scrollBefore is null', () => {
    const inst = makeInstance(makeEl(0));
    inst.getContainerElement.mockReturnValue(null);
    const viewer = makeViewer(inst);
    const after = vi.fn();

    runCodeViewMutationPreservingScroll(viewer, vi.fn(), after);

    expect(after).toHaveBeenCalledOnce();
    expect(inst.scrollTo).not.toHaveBeenCalled();
  });

  it('does not crash when after is undefined', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);

    expect(() => runCodeViewMutationPreservingScroll(viewer, vi.fn(), undefined)).not.toThrow();
  });
});

describe('deferCodeViewControlledSync', () => {
  it('calls sync immediately when viewer is null', () => {
    const sync = vi.fn();

    deferCodeViewControlledSync(null, sync);

    expect(sync).toHaveBeenCalledOnce();
  });

  it('calls sync immediately when viewer is undefined', () => {
    const sync = vi.fn();

    deferCodeViewControlledSync(undefined, sync);

    expect(sync).toHaveBeenCalledOnce();
  });

  it('defers sync through runCodeViewMutationPreservingScroll', () => {
    const el = makeEl(100);
    const inst = makeInstance(el);
    const viewer = makeViewer(inst);
    const sync = vi.fn();

    deferCodeViewControlledSync(viewer, sync);

    expect(inst.capturePendingLayoutAnchor).toHaveBeenCalledOnce();
    expect(sync).toHaveBeenCalledOnce();
  });
});
