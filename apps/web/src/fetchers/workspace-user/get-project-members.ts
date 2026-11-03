import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type GetProjectMembersRequest = {
  workspaceId: string;
  /** Omit for every workspace member. */
  projectId?: string;
};

async function getProjectMembers({
  workspaceId,
  projectId,
}: GetProjectMembersRequest) {
  const response = await client.workspace[":workspaceId"].members.$get({
    param: { workspaceId },
    query: projectId ? { projectId } : {},
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getProjectMembers;
