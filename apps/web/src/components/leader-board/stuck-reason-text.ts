type Translate = (key: string, options?: Record<string, unknown>) => string;

type StuckCard = {
  stuck: boolean;
  stuckReason: "overdue" | "idle" | "last_role" | null;
  stuckDays: number | null;
  myRoles: readonly { roleName: string; progress: string }[];
};

/**
 * Why a card is stuck: "已逾期", "停滞 9 天", or "只差开发". For the last role,
 * name the person's own unfinished role on the task.
 */
export function stuckReasonText(card: StuckCard, t: Translate): string | null {
  if (!card.stuck || !card.stuckReason) return null;
  switch (card.stuckReason) {
    case "overdue":
      return t("workspace:leaderBoard.stuck.overdue");
    case "idle":
      return t("workspace:leaderBoard.stuck.idle", {
        count: card.stuckDays ?? 0,
      });
    case "last_role": {
      const role =
        card.myRoles.find((entry) => entry.progress !== "done")?.roleName ??
        card.myRoles[0]?.roleName;
      return role
        ? t("workspace:leaderBoard.stuck.lastRole", { role })
        : t("workspace:leaderBoard.stuck.lastRoleUnknown");
    }
  }
}
