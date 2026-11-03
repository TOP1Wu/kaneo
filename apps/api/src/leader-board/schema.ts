import { VALID_PRIORITIES } from "../task/validate-task-fields";
import { csvList, scopeQueryShape } from "../org-unit/scope/scope-query";
import { z } from "../openapi";
import { PROGRESS_VALUES } from "./stuck";

export const leaderBoardParam = z.object({ workspaceId: z.string().min(1) });

export const leaderBoardQuery = z.object({
  ...scopeQueryShape,
  roleIds: csvList(
    "Comma-separated task role IDs; keeps tasks where the person holds one of them.",
  ),
  progress: csvList(
    "Comma-separated personal progress (todo, doing, done), using the person's furthest-behind role on the task.",
    PROGRESS_VALUES,
  ),
  priority: csvList("Comma-separated task priorities.", VALID_PRIORITIES),
  overdue: z.enum(["true", "false"]).optional().openapi({
    description:
      "true keeps only overdue cards, false only cards that are not.",
  }),
});
