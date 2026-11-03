import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type UpdateTaskMemberBody = InferRequestType<
  (typeof client)["task-member"][":memberId"]["$patch"]
>["json"];

async function updateTaskMember(memberId: string, body: UpdateTaskMemberBody) {
  const response = await client["task-member"][":memberId"].$patch({
    param: { memberId },
    json: body,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateTaskMember;
