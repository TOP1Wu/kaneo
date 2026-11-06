import { getLedUnits } from "../get-led-units";
import { isWorkspaceAdmin } from "../is-workspace-admin";

export async function getMyScope(
  workspaceId: string,
  userId: string,
  isInstanceAdmin: boolean,
) {
  const [workspaceAdmin, led] = await Promise.all([
    isWorkspaceAdmin(workspaceId, userId),
    getLedUnits(workspaceId, userId),
  ]);
  return {
    isWorkspaceAdmin: workspaceAdmin,
    isInstanceAdmin,
    ledSubtreeUnitIds: led.subtree,
    subordinateUserIds: led.subordinateUserIds,
  };
}
