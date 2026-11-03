import { BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export function ReadyForReviewBadge({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-success/10 px-1.5 font-medium text-[11px] text-success-foreground",
        className,
      )}
    >
      <BadgeCheck aria-hidden="true" className="size-3" />
      {t("tasks:members.readyForReview")}
    </span>
  );
}
