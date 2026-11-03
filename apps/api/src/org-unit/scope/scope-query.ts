import { z } from "../../openapi";
import { SCOPE_NAMES } from "./resolve-scope";

const MAX_LIST = 100;

/** Comma-separated query values, trimmed, with empty entries dropped. */
export function csvList<T extends string>(
  description: string,
  allowed?: readonly T[],
) {
  return (
    z
      .string()
      .optional()
      .transform((value) =>
        value === undefined
          ? undefined
          : [...new Set(value.split(",").map((entry) => entry.trim()))].filter(
              Boolean,
            ),
      )
      .refine((values) => !values || values.length <= MAX_LIST, {
        message: `At most ${MAX_LIST} values`,
      })
      .refine(
        (values) =>
          !values ||
          !allowed ||
          values.every((entry) => allowed.includes(entry as T)),
        { message: `Allowed values: ${allowed?.join(", ")}` },
      )
      // An empty list (`?projectIds=`) means no filter, not "match nothing".
      .transform((values) =>
        values && values.length > 0 ? (values as T[]) : undefined,
      )
      .openapi({ type: "string", description })
  );
}

export const scopeQueryShape = {
  scope: z.enum(SCOPE_NAMES).optional().default("mine").openapi({
    description:
      "mine: the caller and everyone below them in the org structure. unit: a unit and its descendants (leaders of it or its parents, and admins). all: every workspace member (workspace or instance admins).",
  }),
  unitId: z.string().min(1).optional().openapi({
    description: "Org unit for scope=unit.",
  }),
  projectIds: csvList("Comma-separated project IDs to include."),
};
