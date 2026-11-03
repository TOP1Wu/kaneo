import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type TaskRole = InferResponseType<
  (typeof client)["task-role"][":workspaceId"]["$get"],
  200
>["roles"][number];

async function getTaskRoles(workspaceId: string) {
  const response = await client["task-role"][":workspaceId"].$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getTaskRoles;
