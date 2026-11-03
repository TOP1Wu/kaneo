import { taskMembersView } from "../load-task-members";

async function getTaskMembers(taskId: string) {
  return taskMembersView(taskId);
}

export default getTaskMembers;
