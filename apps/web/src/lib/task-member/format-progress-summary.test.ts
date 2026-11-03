import { describe, expect, it } from "vite-plus/test";
import {
  formatProgressSummary,
  progressSegments,
} from "./format-progress-summary";

const role = (
  roleId: string,
  roleName: string,
  done: number,
  total: number,
) => ({
  roleId,
  roleName,
  done,
  total,
});

describe("formatProgressSummary", () => {
  it("joins roles in API order", () => {
    expect(
      formatProgressSummary([
        role("p", "产品", 2, 2),
        role("d", "开发", 1, 3),
        role("q", "测试", 0, 2),
      ]),
    ).toBe("产品 2/2 · 开发 1/3 · 测试 0/2");
  });

  it("skips empty roles and returns nothing without members", () => {
    expect(formatProgressSummary([role("d", "开发", 0, 0)])).toBe("");
    expect(formatProgressSummary([])).toBe("");
  });

  it("marks a role complete only when every member is done", () => {
    expect(
      progressSegments([role("p", "产品", 2, 2), role("d", "开发", 1, 3)]).map(
        (segment) => segment.complete,
      ),
    ).toEqual([true, false]);
  });
});
