import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DueDateText } from "@/components/my-work/due-date-text";
import type { LeaderBoardCard as Card } from "@/fetchers/leader-board/get-leader-board";
import { cn } from "@/lib/cn";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import { PROGRESS_TONE } from "@/lib/task-member/progress-tone";
import { isCardDone } from "./card-progress";
import { stuckReasonText } from "./stuck-reason-text";

type LeaderBoardCardProps = {
  card: Card;
  onOpen: (card: Card) => void;
};

export function LeaderBoardCard({ card, onOpen }: LeaderBoardCardProps) {
  const { t } = useTranslation();
  const reason = stuckReasonText(card, t);
  const done = isCardDone(card);

  return (
    <button
      type="button"
      data-task-id={card.taskId}
      data-done={done || undefined}
      onClick={() => onOpen(card)}
      className={cn(
        "flex w-full shrink-0 flex-col gap-1.5 rounded-lg border bg-board-card p-2.5 text-left shadow-xs/5 outline-none transition-[border-color,opacity] hover:border-board-card-border-hover focus-visible:ring-2 focus-visible:ring-ring",
        card.stuck ? "border-destructive/40" : "border-board-card-border",
        // Finished for this person: still reachable, but out of the way.
        done && "opacity-55 hover:opacity-100 focus-visible:opacity-100",
      )}
    >
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <span className="truncate">{card.projectName}</span>
        <span aria-hidden="true">·</span>
        <span className="shrink-0 font-mono">{card.ticket}</span>
      </span>
      <span className="break-words font-medium text-[13px] text-board-title leading-[18px]">
        {card.title}
      </span>
      <span className="flex flex-wrap items-center gap-1">
        {card.myRoles.map((role) => (
          <span
            key={role.roleId}
            data-progress={role.progress}
            className={cn(
              "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px]",
              PROGRESS_TONE[role.progress].badge,
            )}
          >
            <span className="text-foreground/80">{role.roleName}</span>
            {t(`tasks:members.progress.${role.progress}`)}
          </span>
        ))}
      </span>
      <span className="flex items-center gap-2 text-xs">
        <span
          className="flex shrink-0 items-center [&_svg]:size-3.5"
          title={getPriorityLabel(card.priority)}
        >
          {getPriorityIcon(card.priority)}
          <span className="sr-only">{getPriorityLabel(card.priority)}</span>
        </span>
        <DueDateText dueDate={card.dueDate} className="text-xs" />
        <span className="flex-1" />
        {reason && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-[11px] text-destructive-foreground">
            <AlertTriangle aria-hidden="true" className="size-3" />
            {reason}
          </span>
        )}
      </span>
    </button>
  );
}
