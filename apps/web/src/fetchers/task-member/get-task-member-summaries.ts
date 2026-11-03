import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type TaskMemberSummaries = InferResponseType<
  (typeof client)["task-member"]["summary"]["$get"],
  200
>;

export type TaskMemberSummary = TaskMemberSummaries["summaries"][number];

async function getTaskMemberSummaries(taskIds: string[]) {
  const response = await client["task-member"].summary.$get({
    query: { taskIds: taskIds.join(",") },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getTaskMemberSummaries;
