export type MemberProgress = "todo" | "doing" | "done";

type Stamps = { startedAt: Date | null; doneAt: Date | null };

/**
 * Timestamps after a progress change: doing stamps startedAt once, done stamps
 * doneAt, and leaving done clears doneAt (a withdrawal).
 */
export function progressTimestamps(
  from: MemberProgress,
  to: MemberProgress,
  current: Stamps,
  now: Date,
): Stamps {
  if (from === to) return current;
  return {
    startedAt:
      to === "doing" || to === "done"
        ? (current.startedAt ?? now)
        : current.startedAt,
    doneAt: to === "done" ? now : null,
  };
}
