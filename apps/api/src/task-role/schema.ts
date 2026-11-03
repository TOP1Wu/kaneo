import { z } from "../openapi";

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Expected a hex color")
  .openapi({ example: "#3B82F6" });

export const workspaceIdParam = z.object({ workspaceId: z.string() });

export const taskRoleIdParam = z.object({ id: z.string() });

export const createTaskRoleBody = z.object({
  name: z.string().trim().min(1).max(64),
  color: hexColor.nullable().optional(),
});

export const updateTaskRoleBody = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  color: hexColor.nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
  archived: z.boolean().optional().openapi({
    description:
      "Archive (true) or restore (false) the role. The workspace's only owner role can't be archived.",
  }),
});
