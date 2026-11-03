import { describe, expect, it } from "vite-plus/test";
import { flattenOrgTree, subtreeIds } from "./org-tree";

const unit = (id: string, parentId: string | null, position = 0) => ({
  id,
  parentId,
  name: id,
  position,
});

describe("flattenOrgTree", () => {
  it("walks depth-first in sibling order", () => {
    const rows = flattenOrgTree([
      unit("eng", null, 0),
      unit("mobile", "eng", 1),
      unit("web", "eng", 0),
      unit("product", null, 1),
    ]);
    expect(rows.map((row) => [row.unit.id, row.depth])).toEqual([
      ["eng", 0],
      ["web", 1],
      ["mobile", 1],
      ["product", 0],
    ]);
  });

  it("shows a unit with a missing parent as a root", () => {
    expect(
      flattenOrgTree([unit("orphan", "gone")]).map((row) => row.depth),
    ).toEqual([0]);
  });
});

describe("subtreeIds", () => {
  it("collects every descendant", () => {
    const units = [
      unit("a", null),
      unit("b", "a"),
      unit("c", "b"),
      unit("d", null),
    ];
    expect([...subtreeIds(units, "a")].sort()).toEqual(["a", "b", "c"]);
  });
});
