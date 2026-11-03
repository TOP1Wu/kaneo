import useGetMyOrgScope from "@/hooks/queries/org-unit/use-get-my-org-scope";
import useGetOrgUnits from "@/hooks/queries/org-unit/use-get-org-units";
import { useStoredState } from "@/hooks/use-stored-state";
import { resolveSelection, scopeOptions } from "@/lib/org-scope/scope-options";
import type { ScopeSelection } from "@/lib/org-scope/scope-query";

function parseSelection(raw: unknown): ScopeSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const { scope, unitId } = raw as Record<string, unknown>;
  if (scope !== "mine" && scope !== "unit" && scope !== "all") return null;
  return { scope, unitId: typeof unitId === "string" ? unitId : undefined };
}

/**
 * The scope switch shared by the leader board and the dashboard. The choice is
 * remembered per workspace and narrowed to what /my-scope allows.
 */
export function useOrgViewScope(workspaceId: string) {
  const scopeQuery = useGetMyOrgScope(workspaceId);
  const unitsQuery = useGetOrgUnits(workspaceId);
  const units = unitsQuery.data?.units ?? [];
  const options = scopeOptions(scopeQuery.data, units);
  const [stored, setStored] = useStoredState<ScopeSelection | null>(
    workspaceId ? `kaneo:org-view-scope:${workspaceId}` : null,
    parseSelection,
    null,
  );
  const selection = resolveSelection(stored, options);

  return {
    options,
    units,
    selection,
    setSelection: setStored,
    // Requests wait for /my-scope so nobody briefly fetches a forbidden scope.
    ready: scopeQuery.isSuccess && !unitsQuery.isPending,
  };
}
