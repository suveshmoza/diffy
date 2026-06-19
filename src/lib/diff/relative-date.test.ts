import { describe, expect, it, vi } from 'vitest';

import { formatRelativeDate } from './relative-date';

describe('formatRelativeDate', () => {
  it('returns "just now" for dates within the last minute', () => {
    const result = formatRelativeDate(new Date().toISOString());
    expect(result).toBe('just now');
  });

  it('returns "5m ago" for a date 5 minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeDate(date)).toBe('5m ago');
  });

  it('returns "3h ago" for a date 3 hours ago', () => {
    const date = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeDate(date)).toBe('3h ago');
  });

  it('returns "2d ago" for a date 2 days ago', () => {
    const date = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(formatRelativeDate(date)).toBe('2d ago');
  });

  it('returns a formatted date string for dates older than a week', () => {
    const date = new Date('2025-06-01T12:00:00Z');
    vi.setSystemTime(new Date('2025-09-15T12:00:00Z'));
    expect(formatRelativeDate(date.toISOString())).toBe('Jun 1, 2025');
    vi.useRealTimers();
  });
});
