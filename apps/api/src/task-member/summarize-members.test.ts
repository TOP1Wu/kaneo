import { describe, expect, it } from "vite-plus/test";
import { summarizeMembers } from "./summarize-members";

const role = (roleId: string, rolePosition: number) => ({
  roleId,
  roleName: roleId.toUpperCase(),
  roleSlug: roleId,
  rolePosition,
});

describe("summarizeMembers", () => {
  it("counts members per role in role order", () => {
    const result = summarizeMembers([
      { ...role("qa", 3), progress: "todo" },
      { ...role("dev", 2), progress: "done" },
      { ...role("dev", 2), progress: "doing" },
      { ...role("product", 1), progress: "done" },
    ]);
    expect(result.summary).toEqual([
      {
        roleId: "product",
        roleName: "PRODUCT",
        roleSlug: "product",
        total: 1,
        done: 1,
      },
      { roleId: "dev", roleName: "DEV", roleSlug: "dev", total: 2, done: 1 },
      { roleId: "qa", roleName: "QA", roleSlug: "qa", total: 1, done: 0 },
    ]);
    expect(result.readyForReview).toBe(false);
  });

  it("is ready for review only when there are members and all are done", () => {
    expect(summarizeMembers([]).readyForReview).toBe(false);
    expect(
      summarizeMembers([
        { ...role("dev", 2), progress: "done" },
        { ...role("qa", 3), progress: "done" },
      ]).readyForReview,
    ).toBe(true);
  });
});
