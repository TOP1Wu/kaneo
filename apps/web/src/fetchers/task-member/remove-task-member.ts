import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function removeTaskMember(memberId: string) {
  const response = await client["task-member"][":memberId"].$delete({
    param: { memberId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default removeTaskMember;
