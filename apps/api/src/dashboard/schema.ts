import { scopeQueryShape } from "../org-unit/scope/scope-query";
import { z } from "../openapi";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function createdBound(edge: "from" | "to") {
  return z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || !Number.isNaN(Date.parse(value)),
      {
        message: "Expected a date (YYYY-MM-DD) or an ISO date-time",
      },
    )
    .transform((value) => {
      if (value === undefined) return undefined;
      const date = new Date(value);
      if (edge === "from") return date;
      // `to` is inclusive: a bare date covers that whole day.
      return new Date(date.getTime() + (DATE_ONLY.test(value) ? DAY_MS : 1));
    })
    .openapi({
      type: "string",
      description:
        edge === "from"
          ? "Only tasks created at or after this date (YYYY-MM-DD, UTC) or date-time."
          : "Only tasks created on or before this date (YYYY-MM-DD, UTC, whole day) or date-time.",
    });
}

export const dashboardParam = z.object({ workspaceId: z.string().min(1) });

export const dashboardQuery = z.object({
  ...scopeQueryShape,
  from: createdBound("from"),
  to: createdBound("to"),
});
