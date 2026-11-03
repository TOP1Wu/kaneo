import { getLedUnitIds } from "../get-led-unit-ids";
import { getSubordinateUserIds } from "../get-subordinate-user-ids";
import { isWorkspaceAdmin } from "../is-workspace-admin";

export async function getMyScope(
  workspaceId: string,
  userId: string,
  isInstanceAdmin: boolean,
) {
  const [workspaceAdmin, ledUnits, subordinateUserIds] = await Promise.all([
    isWorkspaceAdmin(workspaceId, userId),
    getLedUnitIds(workspaceId, userId),
    getSubordinateUserIds(workspaceId, userId),
  ]);
  return {
    isWorkspaceAdmin: workspaceAdmin,
    isInstanceAdmin,
    leadUnitIds: ledUnits.direct,
    subordinateUserIds,
  };
}
