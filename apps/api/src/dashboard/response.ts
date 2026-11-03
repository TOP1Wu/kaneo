import { stuckReasonSchema } from "../leader-board/response";
import { z } from "../openapi";

const statusCountSchema = z
  .object({
    status: z.string(),
    statusName: z.string(),
    count: z.number().int(),
  })
  .openapi("DashboardStatusCount");

export const dashboardSchema = z
  .object({
    totals: z.object({
      tasks: z.number().int(),
      overdue: z.number().int().openapi({
        description:
          "Open tasks past their due day with at least one member not done.",
      }),
      readyForReview: z.number().int().openapi({
        description:
          "Tasks whose members are all done but that are not in a done column yet.",
      }),
      stuck: z.number().int(),
      byStatus: z.array(statusCountSchema),
    }),
    workload: z
      .array(
        z.object({
          userId: z.string(),
          userName: z.string(),
          todo: z.number().int(),
          doing: z.number().int(),
          done: z.number().int(),
        }),
      )
      .openapi({
        description:
          "Tasks per person by personal progress. A person with several roles on a task counts once, at their furthest-behind progress.",
      }),
    byProject: z.array(
      z.object({
        projectId: z.string(),
        projectName: z.string(),
        byStatus: z.array(statusCountSchema),
      }),
    ),
    roleCompletion: z
      .array(
        z.object({
          roleId: z.string(),
          roleName: z.string(),
          total: z.number().int(),
          done: z.number().int(),
        }),
      )
      .openapi({
        description: "Member rows per task role and how many are done.",
      }),
    stuckList: z
      .array(
        z.object({
          taskId: z.string(),
          ticket: z.string(),
          title: z.string(),
          projectId: z.string(),
          projectName: z.string(),
          stuckReason: stuckReasonSchema.unwrap(),
          stuckDays: z.number().int(),
          blockedBy: z.array(
            z.object({
              userId: z.string(),
              userName: z.string(),
              roleName: z.string(),
            }),
          ),
        }),
      )
      .openapi({
        description: "At most 50 stuck open tasks, longest stuck first.",
      }),
  })
  .openapi("Dashboard");
