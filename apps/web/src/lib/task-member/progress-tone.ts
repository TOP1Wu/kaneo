import type { MemberProgress } from "@/fetchers/task-member/get-task-members";

/**
 * The one color language for personal progress, shared by the dashboard
 * charts and the leader board: done is success green, doing is info blue,
 * not started is neutral gray. Green and blue mean nothing else on those
 * pages. `bar` must stay distinguishable from the empty `PROGRESS_TRACK`.
 */
export const PROGRESS_TONE: Record<
  MemberProgress,
  { bar: string; badge: string }
> = {
  done: {
    bar: "bg-success",
    badge: "bg-success/12 text-success-foreground dark:bg-success/18",
  },
  doing: {
    bar: "bg-info",
    badge: "bg-info/12 text-info-foreground dark:bg-info/18",
  },
  todo: {
    bar: "bg-neutral-400 dark:bg-neutral-500",
    badge: "bg-muted text-muted-foreground",
  },
};

/** The empty rail behind progress bars. */
export const PROGRESS_TRACK = "bg-neutral-100 dark:bg-neutral-800";

/** Stacking order for progress segments and legends. */
export const PROGRESS_ORDER = ["done", "doing", "todo"] as const;

/**
 * Status columns colored by meaning, not by slot: the final column reads as
 * done (green), every other status gets a neutral shade so no other status
 * borrows green or blue.
 */
const STATUS_SHADES = [
  "bg-neutral-300 dark:bg-neutral-600",
  "bg-neutral-400 dark:bg-neutral-500",
  "bg-neutral-500 dark:bg-neutral-400",
  "bg-neutral-600 dark:bg-neutral-300",
  "bg-neutral-700 dark:bg-neutral-200",
] as const;

export function statusTones(
  statuses: readonly { status: string; isFinal: boolean }[],
): Map<string, string> {
  const tones = new Map<string, string>();
  let shade = 0;
  for (const { status, isFinal } of statuses) {
    if (tones.has(status)) continue;
    if (isFinal) {
      tones.set(status, PROGRESS_TONE.done.bar);
      continue;
    }
    tones.set(status, STATUS_SHADES[shade % STATUS_SHADES.length] as string);
    shade += 1;
  }
  return tones;
}
