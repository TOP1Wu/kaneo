import type { ScopeName, ScopeSelection } from "./scope-query";

type MyScope = {
  isWorkspaceAdmin: boolean;
  isInstanceAdmin: boolean;
  ledSubtreeUnitIds: readonly string[];
  subordinateUserIds: readonly string[];
};

type ScopeUnit = { id: string };

export type ScopeOptions = {
  scopes: ScopeName[];
  /** Units the caller may pick for scope=unit. */
  unitIds: string[];
  defaultSelection: ScopeSelection;
};

/**
 * Which scopes the switcher offers. It mirrors the API's rules so nobody is
 * offered a 403: everyone has "mine", leaders open the units they lead (the
 * subtree /my-scope resolved), and admins open any unit and "all".
 */
export function scopeOptions(
  scope: MyScope | undefined,
  units: readonly ScopeUnit[],
): ScopeOptions {
  const isAdmin = Boolean(scope?.isWorkspaceAdmin || scope?.isInstanceAdmin);
  const unitIds = isAdmin
    ? units.map((unit) => unit.id)
    : [...(scope?.ledSubtreeUnitIds ?? [])];

  const scopes: ScopeName[] = ["mine"];
  if (unitIds.length > 0) scopes.push("unit");
  if (isAdmin) scopes.push("all");

  // An admin who leads nobody would see only themselves under "mine".
  const leadsSomeone = (scope?.subordinateUserIds.length ?? 0) > 0;
  const defaultSelection: ScopeSelection =
    isAdmin && !leadsSomeone ? { scope: "all" } : { scope: "mine" };

  return { scopes, unitIds, defaultSelection };
}

/** Keeps a stored selection only while it is still allowed. */
export function resolveSelection(
  wanted: ScopeSelection | null,
  options: ScopeOptions,
): ScopeSelection {
  if (!wanted || !options.scopes.includes(wanted.scope))
    return options.defaultSelection;
  if (wanted.scope !== "unit") return { scope: wanted.scope };
  const unitId =
    wanted.unitId && options.unitIds.includes(wanted.unitId)
      ? wanted.unitId
      : options.unitIds[0];
  return unitId ? { scope: "unit", unitId } : options.defaultSelection;
}
