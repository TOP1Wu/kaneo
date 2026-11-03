import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type UpdateOrgUnitBody = InferRequestType<
  (typeof client)["org-unit"][":id"]["$put"]
>["json"];

async function updateOrgUnit(id: string, body: UpdateOrgUnitBody) {
  const response = await client["org-unit"][":id"].$put({
    param: { id },
    json: body,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateOrgUnit;
