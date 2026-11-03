import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";
import {
  type DashboardRange,
  type ScopeSelection,
  toDashboardQuery,
} from "@/lib/org-scope/scope-query";

export type Dashboard = InferResponseType<
  (typeof client)["dashboard"][":workspaceId"]["$get"],
  200
>;

async function getDashboard(
  workspaceId: string,
  selection: ScopeSelection,
  projectIds: string[],
  range: DashboardRange,
) {
  const response = await client.dashboard[":workspaceId"].$get({
    param: { workspaceId },
    query: toDashboardQuery(selection, projectIds, range),
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getDashboard;
