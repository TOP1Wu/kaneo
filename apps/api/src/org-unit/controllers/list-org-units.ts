import { asc, desc, eq, inArray } from "drizzle-orm";
import db from "../../database";
import {
  orgUnitMemberTable,
  orgUnitTable,
  userTable,
} from "../../database/schema";

export type OrgUnitView = {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
  members: {
    userId: string;
    userName: string;
    userImage: string | null;
    isLeader: boolean;
  }[];
};

const unitColumns = {
  id: orgUnitTable.id,
  parentId: orgUnitTable.parentId,
  name: orgUnitTable.name,
  position: orgUnitTable.position,
};

async function withMembers(
  units: Omit<OrgUnitView, "members">[],
): Promise<OrgUnitView[]> {
  if (units.length === 0) return [];
  const members = await db
    .select({
      orgUnitId: orgUnitMemberTable.orgUnitId,
      userId: orgUnitMemberTable.userId,
      userName: userTable.name,
      userImage: userTable.image,
      isLeader: orgUnitMemberTable.isLeader,
    })
    .from(orgUnitMemberTable)
    .innerJoin(userTable, eq(userTable.id, orgUnitMemberTable.userId))
    .where(
      inArray(
        orgUnitMemberTable.orgUnitId,
        units.map((unit) => unit.id),
      ),
    )
    .orderBy(
      desc(orgUnitMemberTable.isLeader),
      asc(userTable.name),
      asc(orgUnitMemberTable.userId),
    );

  const byUnit = new Map<string, OrgUnitView["members"]>();
  for (const { orgUnitId, ...member } of members) {
    const list = byUnit.get(orgUnitId) ?? [];
    list.push(member);
    byUnit.set(orgUnitId, list);
  }
  return units.map((unit) => ({ ...unit, members: byUnit.get(unit.id) ?? [] }));
}

export async function listOrgUnits(workspaceId: string) {
  const units = await db
    .select(unitColumns)
    .from(orgUnitTable)
    .where(eq(orgUnitTable.workspaceId, workspaceId))
    .orderBy(
      asc(orgUnitTable.position),
      asc(orgUnitTable.name),
      asc(orgUnitTable.id),
    );
  return { units: await withMembers(units) };
}

export async function getOrgUnit(id: string): Promise<OrgUnitView | null> {
  const units = await db
    .select(unitColumns)
    .from(orgUnitTable)
    .where(eq(orgUnitTable.id, id))
    .limit(1);
  const [unit] = await withMembers(units);
  return unit ?? null;
}
