import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import type {
  LeaderBoardCard as Card,
  LeaderBoardPerson,
} from "@/fetchers/leader-board/get-leader-board";
import { cn } from "@/lib/cn";
import { LeaderBoardCard } from "./leader-board-card";

type LeaderBoardColumnProps = {
  person: LeaderBoardPerson;
  onOpen: (card: Card) => void;
};

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", value > 0 && tone)}>
      <span className="tabular-nums font-medium">{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function LeaderBoardColumn({ person, onOpen }: LeaderBoardColumnProps) {
  const { t } = useTranslation();
  const hidden = person.counts.total - person.cards.length;

  return (
    <section
      aria-label={person.userName}
      className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-board-lane"
    >
      <header className="flex flex-col gap-1.5 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <AssigneeAvatar
            name={person.userName}
            image={person.userImage}
            assigned
            className="size-6"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-sm">
              {person.userName}
            </h2>
            <p className="truncate text-muted-foreground text-xs">
              {person.unitNames.length > 0
                ? person.unitNames.join("、")
                : t("workspace:leaderBoard.noUnit")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
          <Count
            label={t("workspace:leaderBoard.counts.doing")}
            value={person.counts.doing}
          />
          <Count
            label={t("workspace:leaderBoard.counts.overdue")}
            value={person.counts.overdue}
            tone="text-due-overdue"
          />
          <Count
            label={t("workspace:leaderBoard.counts.stuck")}
            value={person.counts.stuck}
            tone="text-destructive-foreground"
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {person.cards.length === 0 ? (
          <p className="px-1 py-2 text-muted-foreground text-xs">
            {t("workspace:leaderBoard.noCards")}
          </p>
        ) : (
          person.cards.map((card) => (
            <LeaderBoardCard key={card.taskId} card={card} onOpen={onOpen} />
          ))
        )}
        {hidden > 0 && (
          <p className="px-1 py-1 text-muted-foreground text-xs">
            {t("workspace:leaderBoard.moreCards", { count: hidden })}
          </p>
        )}
      </div>
    </section>
  );
}
