import { describe, expect, it } from "vite-plus/test";
import { resolveSelection, scopeOptions } from "./scope-options";

const units = [
  { id: "eng", parentId: null },
  { id: "mobile", parentId: "eng" },
  { id: "product", parentId: null },
];

const member = {
  isWorkspaceAdmin: false,
  isInstanceAdmin: false,
  ledSubtreeUnitIds: [],
  subordinateUserIds: [],
};

describe("scopeOptions", () => {
  it("offers a plain member only their own work", () => {
    expect(scopeOptions(member, units)).toEqual({
      scopes: ["mine"],
      unitIds: [],
      defaultSelection: { scope: "mine" },
    });
  });

  it("lets a leader open the units they lead and their children", () => {
    const options = scopeOptions(
      {
        ...member,
        ledSubtreeUnitIds: ["eng", "mobile"],
        subordinateUserIds: ["u1"],
      },
      units,
    );
    expect(options.scopes).toEqual(["mine", "unit"]);
    expect(options.unitIds.sort()).toEqual(["eng", "mobile"]);
    expect(options.defaultSelection).toEqual({ scope: "mine" });
  });

  it("gives admins every unit and everyone, defaulting to all", () => {
    for (const admin of [
      { ...member, isWorkspaceAdmin: true },
      { ...member, isInstanceAdmin: true },
    ]) {
      const options = scopeOptions(admin, units);
      expect(options.scopes).toEqual(["mine", "unit", "all"]);
      expect(options.unitIds).toEqual(["eng", "mobile", "product"]);
      expect(options.defaultSelection).toEqual({ scope: "all" });
    }
  });

  it("keeps a leading admin on their own people by default", () => {
    expect(
      scopeOptions(
        { ...member, isWorkspaceAdmin: true, subordinateUserIds: ["u1"] },
        units,
      ).defaultSelection,
    ).toEqual({ scope: "mine" });
  });

  it("hides unit when the workspace has no org structure", () => {
    expect(
      scopeOptions({ ...member, isWorkspaceAdmin: true }, []).scopes,
    ).toEqual(["mine", "all"]);
  });

  it("falls back to mine while the scope is loading", () => {
    expect(scopeOptions(undefined, units).scopes).toEqual(["mine"]);
  });
});

describe("resolveSelection", () => {
  const leader = scopeOptions(
    {
      ...member,
      ledSubtreeUnitIds: ["eng", "mobile"],
      subordinateUserIds: ["u1"],
    },
    units,
  );

  it("drops scopes the caller lost", () => {
    expect(resolveSelection({ scope: "all" }, leader)).toEqual({
      scope: "mine",
    });
  });

  it("swaps an unknown unit for the first allowed one", () => {
    expect(
      resolveSelection({ scope: "unit", unitId: "product" }, leader),
    ).toEqual({
      scope: "unit",
      unitId: leader.unitIds[0],
    });
    expect(
      resolveSelection({ scope: "unit", unitId: "mobile" }, leader),
    ).toEqual({
      scope: "unit",
      unitId: "mobile",
    });
  });
});
