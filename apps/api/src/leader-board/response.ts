import { nullableResponseTimestamp, z } from "../openapi";
import { PROGRESS_VALUES, STUCK_REASONS } from "./stuck";

export const stuckReasonSchema = z.enum(STUCK_REASONS).nullable().openapi({
  description:
    "overdue: past the due day and this person is not done. idle: a doing role unchanged for more than stuckThresholdDays. last_role: every other role is done and this person's role is not.",
});

export const leaderBoardCardSchema = z
  .object({
    taskId: z.string(),
    ticket: z
      .string()
      .openapi({ description: "Project key and task number, like web-12." }),
    title: z.string(),
    projectId: z.string(),
    projectName: z.string(),
    priority: z.string(),
    dueDate: nullableResponseTimestamp,
    status: z.string(),
    statusName: z.string(),
    myRoles: z.array(
      z.object({
        roleId: z.string(),
        roleName: z.string(),
        progress: z.enum(PROGRESS_VALUES),
      }),
    ),
    stuck: z.boolean(),
    stuckReason: stuckReasonSchema,
    stuckDays: z.number().int().nullable().openapi({
      description:
        "Days since this person's most recent progress change, when stuck.",
    }),
  })
  .openapi("LeaderBoardCard");

export const leaderBoardPersonSchema = z
  .object({
    userId: z.string(),
    userName: z.string(),
    userImage: z.string().nullable(),
    unitNames: z.array(z.string()),
    counts: z.object({
      doing: z.number().int(),
      overdue: z.number().int(),
      stuck: z.number().int(),
      total: z.number().int(),
    }),
    cards: z.array(leaderBoardCardSchema).openapi({
      description:
        "At most 100 cards, stuck first, then overdue, priority, and due date. counts cover all of them.",
    }),
  })
  .openapi("LeaderBoardPerson");

export const leaderBoardSchema = z
  .object({
    people: z.array(leaderBoardPersonSchema),
    stuckThresholdDays: z.number().int(),
  })
  .openapi("LeaderBoard");
