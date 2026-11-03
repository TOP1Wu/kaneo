type MemberRow = { userId: string; isOwnerRole: boolean };

export type MemberViewer = {
  userId: string | undefined;
  canUpdateTasks: boolean;
  canManageSettings: boolean;
  subordinateUserIds: readonly string[];
};

export type ProgressAccess = {
  canEdit: boolean;
  /** Editing someone else's row is recorded as an on-behalf change. */
  onBehalf: boolean;
};

export function isPrimaryOwner(
  members: readonly MemberRow[],
  userId: string | undefined,
) {
  return Boolean(
    userId &&
    members.some((member) => member.isOwnerRole && member.userId === userId),
  );
}

/** Mirrors the API's member-management check: add, remove, change role. */
export function canManageMembers(
  members: readonly MemberRow[],
  viewer: MemberViewer,
) {
  return (
    viewer.canUpdateTasks ||
    viewer.canManageSettings ||
    isPrimaryOwner(members, viewer.userId)
  );
}

/**
 * Mirrors the API's progress check so the UI can disable what will fail. The
 * API stays the authority: a leader edit it rejects rolls back with a toast.
 */
export function progressAccess(
  member: MemberRow,
  members: readonly MemberRow[],
  viewer: MemberViewer,
): ProgressAccess {
  if (!viewer.userId) return { canEdit: false, onBehalf: false };
  if (member.userId === viewer.userId)
    return { canEdit: true, onBehalf: false };
  const canEdit =
    viewer.canManageSettings ||
    isPrimaryOwner(members, viewer.userId) ||
    viewer.subordinateUserIds.includes(member.userId);
  return { canEdit, onBehalf: canEdit };
}
