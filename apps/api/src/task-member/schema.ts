import { z } from "../openapi";

export const MAX_SUMMARY_TASK_IDS = 200;

export const memberProgress = z
  .enum(["todo", "doing", "done"])
  .openapi({ description: "A member's own progress on the task." });

export const taskIdParam = z.object({ taskId: z.string() });

export const memberIdParam = z.object({ memberId: z.string() });

export const addTaskMembersBody = z.object({
  roleId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1).max(100).openapi({
    description:
      "Users to add under the role. Existing memberships are skipped.",
  }),
});

export const updateTaskMemberBody = z.object({
  roleId: z.string().min(1).optional(),
  progress: memberProgress.optional(),
  note: z.string().max(2000).nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
});

export const summaryQuery = z.object({
  taskIds: z
    .string()
    .min(1)
    .openapi({
      description: `Comma-separated task IDs, at most ${MAX_SUMMARY_TASK_IDS}.`,
      example: "task-a,task-b",
    }),
});
