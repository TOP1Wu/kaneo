import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  orgUnitTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import { getLedUnits } from "../get-led-units";
import { getUnitSubtreeUserIds } from "../get-unit-subtree-user-ids";
import { isWorkspaceAdmin } from "../is-workspace-admin";
import { resolveScope, type ScopeName, trustedPeople } from "./resolve-scope";

export type LoadedScope = {
  /** People whose tasks the view covers. */
  people: string[];
  /** People whose participation lifts the project access restriction. */
  trusted: string[];
};

async function unitExists(workspaceId: string, unitId: string) {
  const [unit] = await db
    .select({ id: orgUnitTable.id })
    .from(orgUnitTable)
    .where(
      and(
        eq(orgUnitTable.id, unitId),
        eq(orgUnitTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return Boolean(unit);
}

async function workspaceMemberIds(workspaceId: string) {
  const rows = await db
    .select({ userId: workspaceUserTable.userId })
    .from(workspaceUserTable)
    .innerJoin(userTable, eq(userTable.id, workspaceUserTable.userId))
    .where(eq(workspaceUserTable.workspaceId, workspaceId))
    .orderBy(asc(workspaceUserTable.userId));
  return rows.map((row) => row.userId);
}

/** Checks the caller may use `scope`, then resolves who it covers. */
export async function loadScope({
  workspaceId,
  actorId,
  isInstanceAdmin,
  scope,
  unitId,
}: {
  workspaceId: string;
  actorId: string;
  isInstanceAdmin: boolean;
  scope: ScopeName;
  unitId?: string;
}): Promise<LoadedScope> {
  const [workspaceAdmin, led, exists] = await Promise.all([
    isWorkspaceAdmin(workspaceId, actorId),
    getLedUnits(workspaceId, actorId),
    scope === "unit" && unitId
      ? unitExists(workspaceId, unitId)
      : Promise.resolve(false),
  ]);

  const rule = resolveScope(scope, unitId, {
    actorId,
    isWorkspaceAdmin: workspaceAdmin,
    isInstanceAdmin,
    ledSubtreeUnitIds: led.subtree,
    unitExists: exists,
  });
  if (!rule.ok) {
    throw new HTTPException(rule.status, { message: rule.message });
  }

  let people: string[];
  if (scope === "all") {
    people = await workspaceMemberIds(workspaceId);
  } else if (scope === "unit" && unitId) {
    people = await getUnitSubtreeUserIds(workspaceId, unitId);
  } else {
    people = [actorId, ...led.subordinateUserIds];
  }

  return {
    people,
    trusted: trustedPeople(scope, rule.privileged, actorId, people),
  };
}
