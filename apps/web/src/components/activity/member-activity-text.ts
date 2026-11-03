type Translate = (key: string, options?: Record<string, unknown>) => string;

export const MEMBER_ACTIVITY_TYPES = [
  "member_added",
  "member_removed",
  "member_role_changed",
  "member_progress_changed",
  "task_ready_for_review",
] as const;

export type MemberActivityType = (typeof MEMBER_ACTIVITY_TYPES)[number];

export function isMemberActivity(type: string): type is MemberActivityType {
  return (MEMBER_ACTIVITY_TYPES as readonly string[]).includes(type);
}

const PROGRESS = new Set(["todo", "doing", "done"]);

function text(value: unknown) {
  return typeof value === "string" && value ? value : "?";
}

function progressLabel(value: unknown, t: Translate) {
  return typeof value === "string" && PROGRESS.has(value)
    ? t(`activity:member.progress.${value}`)
    : text(value);
}

/**
 * What follows the actor's name in the timeline. An edit on someone else's
 * row reads "何欣 代 胡楠（开发）标记完成".
 */
export function describeMemberActivity(
  type: MemberActivityType,
  eventData: Record<string, unknown> | null,
  t: Translate,
): string {
  const data = eventData ?? {};
  const name = text(data.memberUserName);
  const role = text(data.roleName);

  switch (type) {
    case "member_added":
      return t("activity:member.added", { name, role });
    case "member_removed":
      return t("activity:member.removed", { name, role });
    case "member_role_changed":
      return t("activity:member.roleChanged", {
        name,
        from: text(data.from),
        to: text(data.to),
      });
    case "member_progress_changed":
      return t(
        data.onBehalfOf === true
          ? "activity:member.progressOnBehalf"
          : "activity:member.progressSelf",
        { name, role, progress: progressLabel(data.to, t) },
      );
    case "task_ready_for_review":
      return t("activity:member.readyForReview");
  }
}
