export const SCOPE_NAMES = ["mine", "unit", "all"] as const;
export type ScopeName = (typeof SCOPE_NAMES)[number];

export type ScopeFacts = {
  actorId: string;
  isWorkspaceAdmin: boolean;
  isInstanceAdmin: boolean;
  /** Units the actor leads, plus all of their descendants. */
  ledSubtreeUnitIds: readonly string[];
  /** Whether the requested unit exists in this workspace. */
  unitExists: boolean;
};

export type ScopeRule =
  | { ok: true; privileged: boolean }
  | { ok: false; status: 400 | 403 | 404; message: string };

/**
 * Who may use a scope. `mine` is open to every member; `unit` needs to lead the
 * unit or one of its ancestors, or be an admin; `all` is admin-only.
 */
export function resolveScope(
  scope: ScopeName,
  unitId: string | undefined,
  facts: ScopeFacts,
): ScopeRule {
  const privileged = facts.isWorkspaceAdmin || facts.isInstanceAdmin;

  if (scope === "mine") return { ok: true, privileged };

  if (scope === "all") {
    return privileged
      ? { ok: true, privileged }
      : {
          ok: false,
          status: 403,
          message: "Only workspace or instance admins can view everyone",
        };
  }

  if (!unitId) {
    return { ok: false, status: 400, message: "unitId is required for unit" };
  }
  if (!facts.unitExists) {
    return { ok: false, status: 404, message: "Org unit not found" };
  }
  if (privileged || facts.ledSubtreeUnitIds.includes(unitId)) {
    return { ok: true, privileged };
  }
  return {
    ok: false,
    status: 403,
    message: "Only leaders of this unit or its parents can view it",
  };
}

/**
 * People whose participation makes a task visible even in projects the actor
 * cannot open: a leader's subordinates, or everyone for admin-wide views. The
 * actor's own tasks keep the normal project access rules.
 */
export function trustedPeople(
  scope: ScopeName,
  privileged: boolean,
  actorId: string,
  userIds: readonly string[],
): string[] {
  if (privileged && scope !== "mine") return [...userIds];
  return userIds.filter((userId) => userId !== actorId);
}
