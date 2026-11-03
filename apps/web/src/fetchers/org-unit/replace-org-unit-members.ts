import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type OrgUnitMemberInput = { userId: string; isLeader: boolean };

async function replaceOrgUnitMembers(
  id: string,
  members: OrgUnitMemberInput[],
) {
  const response = await client["org-unit"][":id"].members.$put({
    param: { id },
    json: { members },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default replaceOrgUnitMembers;
