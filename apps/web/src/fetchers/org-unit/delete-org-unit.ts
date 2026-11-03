import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function deleteOrgUnit(id: string) {
  const response = await client["org-unit"][":id"].$delete({ param: { id } });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default deleteOrgUnit;
