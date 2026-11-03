type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The task-level reason in the stuck list; who it waits on is its own column. */
export function stuckReasonLabel(
  reason: "overdue" | "idle" | "last_role",
  t: Translate,
): string {
  return t(`workspace:dashboard.stuckReason.${reason}`);
}
