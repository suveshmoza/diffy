import { describe, expect, it } from 'vitest';

import {
  OVERLAY_CHILD_SOURCE,
  OVERLAY_PARENT_SOURCE,
  isOverlayFrameMessage,
  isOverlayHostMessage,
} from './messages';

describe('isOverlayHostMessage', () => {
  it('returns true for mount message', () => {
    expect(
      isOverlayHostMessage({
        source: OVERLAY_PARENT_SOURCE,
        type: 'mount',
        pullRequestUrl: 'https://github.com/o/r/pull/1',
      }),
    ).toBe(true);
  });

  it('returns true for prefetch message', () => {
    expect(
      isOverlayHostMessage({
        source: OVERLAY_PARENT_SOURCE,
        type: 'prefetch',
        pullRequestUrl: 'https://github.com/o/r/pull/2',
      }),
    ).toBe(true);
  });

  it('returns true for unmount message', () => {
    expect(isOverlayHostMessage({ source: OVERLAY_PARENT_SOURCE, type: 'unmount' })).toBe(true);
  });

  it('returns true for destroy message', () => {
    expect(isOverlayHostMessage({ source: OVERLAY_PARENT_SOURCE, type: 'destroy' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isOverlayHostMessage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isOverlayHostMessage(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isOverlayHostMessage('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isOverlayHostMessage(42)).toBe(false);
  });

  it('returns false for object with wrong source', () => {
    expect(isOverlayHostMessage({ source: OVERLAY_CHILD_SOURCE, type: 'close' })).toBe(false);
  });

  it('returns false for object with unknown source', () => {
    expect(isOverlayHostMessage({ source: 'unknown', type: 'mount' })).toBe(false);
  });

  it('returns false for object missing source', () => {
    expect(isOverlayHostMessage({ type: 'mount' })).toBe(false);
  });
});

describe('isOverlayFrameMessage', () => {
  it('returns true for ready message', () => {
    expect(isOverlayFrameMessage({ source: OVERLAY_CHILD_SOURCE, type: 'ready' })).toBe(true);
  });

  it('returns true for close message', () => {
    expect(isOverlayFrameMessage({ source: OVERLAY_CHILD_SOURCE, type: 'close' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isOverlayFrameMessage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isOverlayFrameMessage(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isOverlayFrameMessage('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isOverlayFrameMessage(42)).toBe(false);
  });

  it('returns false for object with wrong source', () => {
    expect(isOverlayFrameMessage({ source: OVERLAY_PARENT_SOURCE, type: 'mount' })).toBe(false);
  });

  it('returns false for object with unknown source', () => {
    expect(isOverlayFrameMessage({ source: 'unknown', type: 'ready' })).toBe(false);
  });

  it('returns false for object missing source', () => {
    expect(isOverlayFrameMessage({ type: 'close' })).toBe(false);
  });
});
