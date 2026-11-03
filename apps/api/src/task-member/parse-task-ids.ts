import { HTTPException } from "hono/http-exception";
import { MAX_SUMMARY_TASK_IDS } from "./schema";

/** Splits `?taskIds=a,b,c`, rejecting empty lists and more than the batch limit. */
export function parseTaskIds(raw: string | undefined) {
  const ids = [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0)
    throw new HTTPException(400, { message: "taskIds is required" });
  if (ids.length > MAX_SUMMARY_TASK_IDS)
    throw new HTTPException(400, {
      message: `At most ${MAX_SUMMARY_TASK_IDS} taskIds per request`,
    });
  return ids;
}
