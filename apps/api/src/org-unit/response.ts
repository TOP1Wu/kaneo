import { z } from "../openapi";

export const orgUnitMemberSchema = z
  .object({
    userId: z.string(),
    userName: z.string(),
    userImage: z.string().nullable(),
    isLeader: z.boolean(),
  })
  .openapi("OrgUnitMember");

export const orgUnitSchema = z
  .object({
    id: z.string(),
    parentId: z.string().nullable(),
    name: z.string(),
    position: z.number(),
    members: z.array(orgUnitMemberSchema),
  })
  .openapi("OrgUnit");

export const orgUnitListSchema = z
  .object({
    units: z.array(orgUnitSchema).openapi({
      description:
        "Every unit in the workspace as a flat list; build the tree from parentId.",
    }),
  })
  .openapi("OrgUnitList");

export const deletedOrgUnitSchema = z
  .object({ id: z.string() })
  .openapi("DeletedOrgUnit");

export const orgScopeSchema = z
  .object({
    isWorkspaceAdmin: z.boolean(),
    isInstanceAdmin: z.boolean(),
    ledSubtreeUnitIds: z.array(z.string()).openapi({
      description:
        "Units the caller leads and every unit below them: the ones they may open with scope=unit.",
    }),
    subordinateUserIds: z.array(z.string()).openapi({
      description:
        "Members of the units the caller leads and of all their descendant units, excluding the caller.",
    }),
  })
  .openapi("OrgScope");
