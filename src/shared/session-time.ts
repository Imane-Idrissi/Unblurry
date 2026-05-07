import type { SessionEvent } from './types';

/**
 * Walks pause/resume events from `startedAt` to `endTime` and returns the
 * total active (unpaused) duration in minutes (unrounded).
 *
 * Events must be sorted ascending by `created_at`. When `endTime` is omitted,
 * falls back to `Date.now()` so callers can use this for live sessions.
 * Returns 0 when `startedAt` is null.
 */
export function calculateActiveMinutes(
  startedAt: string | null,
  events: SessionEvent[],
  endTime?: string,
): number {
  if (!startedAt) return 0;

  let activeMs = 0;
  let activeSpanStart = new Date(startedAt).getTime();
  let isActive = true;

  for (const event of events) {
    const eventTime = new Date(event.created_at).getTime();
    if (event.event_type === 'paused' && isActive) {
      activeMs += eventTime - activeSpanStart;
      isActive = false;
    } else if (event.event_type === 'resumed' && !isActive) {
      activeSpanStart = eventTime;
      isActive = true;
    }
  }

  if (isActive) {
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    activeMs += end - activeSpanStart;
  }

  return activeMs / 60000;
}
