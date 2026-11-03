import { z } from "../openapi";

export const taskRoleSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    slug: z.string(),
    color: z.string().nullable(),
    position: z.number(),
    isOwnerRole: z.boolean().openapi({
      description:
        "The primary-owner role. Its first member mirrors the task's assignee.",
    }),
    archived: z.boolean(),
  })
  .openapi("TaskRole");

export const taskRoleListSchema = z
  .object({ roles: z.array(taskRoleSchema) })
  .openapi("TaskRoleList");
