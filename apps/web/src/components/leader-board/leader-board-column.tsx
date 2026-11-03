import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import type {
  LeaderBoardCard as Card,
  LeaderBoardPerson,
} from "@/fetchers/leader-board/get-leader-board";
import { cn } from "@/lib/cn";
import { openCardsFirst } from "./card-progress";
import { LeaderBoardCard } from "./leader-board-card";

type LeaderBoardColumnProps = {
  person: LeaderBoardPerson;
  isMe?: boolean;
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

export function LeaderBoardColumn({
  person,
  isMe = false,
  onOpen,
}: LeaderBoardColumnProps) {
  const { t } = useTranslation();
  const hidden = person.counts.total - person.cards.length;
  const cards = openCardsFirst(person.cards);
  const label = isMe
    ? t("workspace:leaderBoard.meColumn", { name: person.userName })
    : person.userName;

  return (
    <section
      aria-label={label}
      className="flex h-full w-[300px] shrink-0 flex-col rounded-xl bg-board-lane"
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
            <h2 className="flex min-w-0 items-center gap-1.5 font-semibold text-sm">
              <span className="truncate">{person.userName}</span>
              {isMe && (
                <span
                  aria-hidden="true"
                  className="shrink-0 rounded-md bg-primary px-1.5 py-px font-medium text-[10px] text-primary-foreground"
                >
                  {t("workspace:leaderBoard.me")}
                </span>
              )}
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
        {cards.length === 0 ? (
          <p className="px-1 py-2 text-muted-foreground text-xs">
            {t("workspace:leaderBoard.noCards")}
          </p>
        ) : (
          cards.map((card) => (
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
