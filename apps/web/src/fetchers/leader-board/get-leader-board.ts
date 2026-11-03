import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";
import {
  type BoardFilters,
  type ScopeSelection,
  toLeaderBoardQuery,
} from "@/lib/org-scope/scope-query";

export type LeaderBoard = InferResponseType<
  (typeof client)["leader-board"][":workspaceId"]["$get"],
  200
>;

export type LeaderBoardPerson = LeaderBoard["people"][number];

export type LeaderBoardCard = LeaderBoardPerson["cards"][number];

async function getLeaderBoard(
  workspaceId: string,
  selection: ScopeSelection,
  filters: BoardFilters,
) {
  const response = await client["leader-board"][":workspaceId"].$get({
    param: { workspaceId },
    query: toLeaderBoardQuery(selection, filters),
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getLeaderBoard;
