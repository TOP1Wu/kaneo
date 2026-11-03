import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { progressSegments } from "@/lib/task-member/format-progress-summary";
import { ReadyForReviewBadge } from "./ready-for-review-badge";
import { useTaskMemberSummary } from "./task-member-summary-context";

type TaskMemberProgressLineProps = {
  taskId: string;
  className?: string;
};

/** "产品 2/2 · 开发 1/3 · 测试 0/2" plus the ready badge, from the board batch. */
export function TaskMemberProgressLine({
  taskId,
  className,
}: TaskMemberProgressLineProps) {
  const { t } = useTranslation();
  const summary = useTaskMemberSummary(taskId);
  const segments = summary ? progressSegments(summary.summary) : [];

  if (segments.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums",
        className,
      )}
    >
      <span className="sr-only">{t("tasks:members.progressLabel")}</span>
      {segments.map((segment, index) => (
        <span key={segment.roleId} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className={cn(segment.complete && "text-foreground/80")}>
            {segment.label}
          </span>
        </span>
      ))}
      {summary?.readyForReview && <ReadyForReviewBadge className="ml-1" />}
    </div>
  );
}
