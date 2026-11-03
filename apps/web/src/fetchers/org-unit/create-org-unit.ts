import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type CreateOrgUnitRequest = {
  workspaceId: string;
  name: string;
  parentId: string | null;
};

async function createOrgUnit({
  workspaceId,
  name,
  parentId,
}: CreateOrgUnitRequest) {
  const response = await client["org-unit"][":workspaceId"].$post({
    param: { workspaceId },
    json: { name, parentId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default createOrgUnit;
