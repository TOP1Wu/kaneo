import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type MyOrgScope = InferResponseType<
  (typeof client)["org-unit"][":workspaceId"]["my-scope"]["$get"],
  200
>;

async function getMyOrgScope(workspaceId: string) {
  const response = await client["org-unit"][":workspaceId"]["my-scope"].$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getMyOrgScope;
