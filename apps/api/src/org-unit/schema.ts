import { z } from "../openapi";

export const workspaceIdParam = z.object({ workspaceId: z.string().min(1) });

export const orgUnitIdParam = z.object({ id: z.string().min(1) });

const unitName = z.string().trim().min(1).max(100).openapi({
  description: "Unit name, 1-100 characters after trimming.",
});

export const createOrgUnitBody = z.object({
  name: unitName,
  parentId: z.string().min(1).nullable().optional().openapi({
    description: "Parent unit in the same workspace. Omit or null for a root.",
  }),
});

export const updateOrgUnitBody = z.object({
  name: unitName.optional(),
  parentId: z.string().min(1).nullable().optional().openapi({
    description:
      "New parent unit, or null to make it a root. A unit can't move under itself or one of its descendants (400).",
  }),
  position: z.number().int().min(0).max(1_000_000).optional().openapi({
    description: "Sort order among siblings, lowest first.",
  }),
});

export const replaceOrgUnitMembersBody = z.object({
  members: z
    .array(
      z.object({
        userId: z.string().min(1),
        isLeader: z.boolean(),
      }),
    )
    .max(500)
    .openapi({
      description:
        "The unit's complete member list. Each userId must be a member of the workspace and appear once.",
    }),
});
