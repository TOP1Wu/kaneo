import { describe, expect, it } from "vite-plus/test";
import { collectSubtreeIds, wouldCreateCycle } from "./collect-subtree-ids";

const units = [
  { id: "root", parentId: null },
  { id: "a", parentId: "root" },
  { id: "a1", parentId: "a" },
  { id: "a2", parentId: "a" },
  { id: "b", parentId: "root" },
  { id: "other", parentId: null },
];

describe("collectSubtreeIds", () => {
  it("includes the roots and every descendant", () => {
    expect([...collectSubtreeIds(units, ["a"])].sort()).toEqual([
      "a",
      "a1",
      "a2",
    ]);
    expect(collectSubtreeIds(units, ["root"]).size).toBe(5);
  });

  it("ignores unknown roots and survives stored cycles", () => {
    expect(collectSubtreeIds(units, ["missing"]).size).toBe(0);
    const looped = [
      { id: "x", parentId: "y" },
      { id: "y", parentId: "x" },
    ];
    expect([...collectSubtreeIds(looped, ["x"])].sort()).toEqual(["x", "y"]);
  });
});

describe("wouldCreateCycle", () => {
  it("rejects moving a unit under itself or a descendant", () => {
    expect(wouldCreateCycle(units, "a", "a")).toBe(true);
    expect(wouldCreateCycle(units, "a", "a1")).toBe(true);
    expect(wouldCreateCycle(units, "root", "a2")).toBe(true);
  });

  it("allows moving to a sibling branch or the root", () => {
    expect(wouldCreateCycle(units, "a", "b")).toBe(false);
    expect(wouldCreateCycle(units, "a1", "other")).toBe(false);
    expect(wouldCreateCycle(units, "a", null)).toBe(false);
  });
});
