import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type TaskMembers = InferResponseType<
  (typeof client)["task-member"]["task"][":taskId"]["$get"],
  200
>;

export type TaskMember = TaskMembers["members"][number];

export type MemberProgress = TaskMember["progress"];

export type RoleSummary = TaskMembers["summary"][number];

async function getTaskMembers(taskId: string) {
  const response = await client["task-member"].task[":taskId"].$get({
    param: { taskId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getTaskMembers;
