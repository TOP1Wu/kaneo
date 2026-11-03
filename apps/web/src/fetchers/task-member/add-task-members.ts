import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type AddTaskMembersRequest = {
  taskId: string;
  roleId: string;
  userIds: string[];
};

async function addTaskMembers({
  taskId,
  roleId,
  userIds,
}: AddTaskMembersRequest) {
  const response = await client["task-member"].task[":taskId"].$post({
    param: { taskId },
    json: { roleId, userIds },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default addTaskMembers;
