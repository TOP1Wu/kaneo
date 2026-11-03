import type { PermissionMap } from "../utils/role-permissions";

// Org structure is workspace administration: reuse the settings permission that
// owners and admins hold instead of adding a new permission point.
export const ORG_ADMIN_PERMISSION: PermissionMap = {
  workspace: ["manage_settings"],
};

export const ORG_READ_PERMISSION: PermissionMap = { workspace: ["read"] };

export const BOARD_READ_PERMISSION: PermissionMap = {
  project: ["read"],
  task: ["read"],
};
