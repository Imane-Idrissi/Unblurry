import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateActiveMinutes } from '../session-time';
import type { SessionEvent } from '../types';

function event(eventType: 'paused' | 'resumed', createdAt: string): SessionEvent {
  return {
    event_id: `${eventType}-${createdAt}`,
    session_id: 's',
    event_type: eventType,
    created_at: createdAt,
  };
}

describe('calculateActiveMinutes', () => {
  it('returns 0 when startedAt is null', () => {
    expect(calculateActiveMinutes(null, [])).toBe(0);
    expect(calculateActiveMinutes(null, [event('paused', '2025-01-01T00:01:00Z')])).toBe(0);
  });

  describe('with no events', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:10:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('falls back to Date.now() when endTime is omitted', () => {
      expect(calculateActiveMinutes('2025-01-01T00:00:00Z', [])).toBe(10);
    });

    it('uses endTime when provided and ignores Date.now()', () => {
      expect(
        calculateActiveMinutes('2025-01-01T00:00:00Z', [], '2025-01-01T00:05:00Z'),
      ).toBe(5);
    });
  });

  it('handles a single pause/resume cycle', () => {
    const minutes = calculateActiveMinutes(
      '2025-01-01T00:00:00Z',
      [
        event('paused', '2025-01-01T00:03:00Z'),
        event('resumed', '2025-01-01T00:05:00Z'),
      ],
      '2025-01-01T00:10:00Z',
    );
    expect(minutes).toBe(8);
  });

  it('handles multiple pause/resume cycles', () => {
    const minutes = calculateActiveMinutes(
      '2025-01-01T00:00:00Z',
      [
        event('paused', '2025-01-01T00:02:00Z'),
        event('resumed', '2025-01-01T00:04:00Z'),
        event('paused', '2025-01-01T00:07:00Z'),
        event('resumed', '2025-01-01T00:10:00Z'),
      ],
      '2025-01-01T00:12:00Z',
    );
    expect(minutes).toBe(7);
  });

  it('does not add an open span when the session ends paused (trailing pause)', () => {
    const minutes = calculateActiveMinutes(
      '2025-01-01T00:00:00Z',
      [event('paused', '2025-01-01T00:03:00Z')],
      '2025-01-01T00:10:00Z',
    );
    expect(minutes).toBe(3);
  });

  it('ignores duplicate paused events while already paused', () => {
    const minutes = calculateActiveMinutes(
      '2025-01-01T00:00:00Z',
      [
        event('paused', '2025-01-01T00:03:00Z'),
        event('paused', '2025-01-01T00:04:00Z'),
        event('resumed', '2025-01-01T00:05:00Z'),
      ],
      '2025-01-01T00:10:00Z',
    );
    expect(minutes).toBe(8);
  });

  it('ignores duplicate resumed events while already active', () => {
    const minutes = calculateActiveMinutes(
      '2025-01-01T00:00:00Z',
      [
        event('resumed', '2025-01-01T00:02:00Z'),
        event('paused', '2025-01-01T00:04:00Z'),
        event('resumed', '2025-01-01T00:06:00Z'),
      ],
      '2025-01-01T00:10:00Z',
    );
    expect(minutes).toBe(8);
  });

  it('does not call Date.now() when endTime is provided', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    calculateActiveMinutes(
      '2025-01-01T00:00:00Z',
      [],
      '2025-01-01T00:05:00Z',
    );
    expect(nowSpy).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });
});
