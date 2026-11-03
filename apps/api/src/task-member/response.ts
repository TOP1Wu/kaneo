import { nullableResponseTimestamp, z } from "../openapi";
import { memberProgress } from "./schema";

export const taskMemberSchema = z
  .object({
    id: z.string(),
    taskId: z.string(),
    userId: z.string(),
    userName: z.string(),
    userImage: z.string().nullable(),
    roleId: z.string(),
    roleName: z.string(),
    roleSlug: z.string(),
    isOwnerRole: z.boolean(),
    progress: memberProgress,
    startedAt: nullableResponseTimestamp,
    doneAt: nullableResponseTimestamp,
    note: z.string().nullable(),
    position: z.number(),
    updatedBy: z.string().nullable().openapi({
      description:
        "Who last changed the row; differs from userId for edits made on the member's behalf.",
    }),
  })
  .openapi("TaskMember");

export const roleSummarySchema = z
  .object({
    roleId: z.string(),
    roleName: z.string(),
    roleSlug: z.string(),
    total: z.number(),
    done: z.number(),
  })
  .openapi("TaskMemberRoleSummary");

const readyForReview = z.boolean().openapi({
  description: "True when the task has members and every one of them is done.",
});

export const taskMembersSchema = z
  .object({
    members: z.array(taskMemberSchema),
    summary: z.array(roleSummarySchema).openapi({
      description:
        "Per-role counts in role order, listing only roles with members.",
    }),
    readyForReview,
  })
  .openapi("TaskMembers");

export const taskMemberSummariesSchema = z
  .object({
    summaries: z.array(
      z
        .object({
          taskId: z.string(),
          summary: z.array(roleSummarySchema),
          readyForReview,
        })
        .openapi("TaskMemberSummary"),
    ),
  })
  .openapi("TaskMemberSummaries");

export const deletedTaskMemberSchema = z
  .object({ id: z.string(), taskId: z.string() })
  .openapi("DeletedTaskMember");
