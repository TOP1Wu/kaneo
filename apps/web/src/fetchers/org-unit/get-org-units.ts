import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type OrgUnit = InferResponseType<
  (typeof client)["org-unit"][":workspaceId"]["$get"],
  200
>["units"][number];

export type OrgUnitMember = OrgUnit["members"][number];

async function getOrgUnits(workspaceId: string) {
  const response = await client["org-unit"][":workspaceId"].$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getOrgUnits;
