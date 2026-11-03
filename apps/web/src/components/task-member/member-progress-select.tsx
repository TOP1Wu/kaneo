import { Circle, CircleCheck, CircleDot } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MemberProgress } from "@/fetchers/task-member/get-task-members";
import { cn } from "@/lib/cn";

export const PROGRESS_VALUES: readonly MemberProgress[] = [
  "todo",
  "doing",
  "done",
];

const progressIcon: Record<MemberProgress, typeof Circle> = {
  todo: Circle,
  doing: CircleDot,
  done: CircleCheck,
};

const progressTone: Record<MemberProgress, string> = {
  todo: "text-muted-foreground",
  doing: "text-info-foreground",
  done: "text-success-foreground",
};

type MemberProgressSelectProps = {
  value: MemberProgress;
  disabled: boolean;
  label: string;
  onChange: (progress: MemberProgress) => void;
};

export function MemberProgressSelect({
  value,
  disabled,
  label,
  onChange,
}: MemberProgressSelectProps) {
  const { t } = useTranslation();
  const reasonId = useId();
  const Icon = progressIcon[value];

  const select = (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (typeof next === "string" && next !== value)
          onChange(next as MemberProgress);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        aria-describedby={disabled ? reasonId : undefined}
        className="h-7 w-30 min-w-0 text-xs sm:min-h-7"
      >
        <SelectValue>
          <span
            className={cn("flex items-center gap-1.5", progressTone[value])}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {t(`tasks:members.progress.${value}`)}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PROGRESS_VALUES.map((progress) => {
          const ItemIcon = progressIcon[progress];
          return (
            <SelectItem key={progress} value={progress}>
              <span className="flex items-center gap-1.5">
                <ItemIcon
                  aria-hidden="true"
                  className={cn("size-3.5", progressTone[progress])}
                />
                {t(`tasks:members.progress.${progress}`)}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  if (!disabled) return select;

  // A disabled button gets no pointer events, so the wrapper owns the hover
  // tooltip; screen readers get the same reason through aria-describedby.
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          {select}
        </TooltipTrigger>
        <TooltipContent>{t("tasks:members.noPermission")}</TooltipContent>
      </Tooltip>
      <span id={reasonId} className="sr-only">
        {t("tasks:members.noPermission")}
      </span>
    </TooltipProvider>
  );
}
