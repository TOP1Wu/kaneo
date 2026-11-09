import { describe, expect, it } from "vite-plus/test";
import { assigneeMenuOptions, personMenuOptions } from "./person-menu-options";

const members = [{ id: "user-1", name: "John Doe", email: null, image: null }];

function selectedValues(options: ReturnType<typeof personMenuOptions>) {
  return options
    .filter((option) => option.selected)
    .map((option) => option.value);
}

describe("personMenuOptions", () => {
  it("lists people without an unassigned row", () => {
    expect(personMenuOptions(members, "user-1").map((o) => o.label)).toEqual([
      "John Doe",
    ]);
  });

  it("marks the current holder", () => {
    expect(selectedValues(personMenuOptions(members, "user-1"))).toEqual([
      "user-1",
    ]);
  });
});

describe("assigneeMenuOptions", () => {
  it("lists unassigned first, then members", () => {
    expect(
      assigneeMenuOptions(members, null, "Unassigned").map(
        (option) => option.label,
      ),
    ).toEqual(["Unassigned", "John Doe"]);
  });

  it("marks unassigned when nobody is assigned", () => {
    expect(
      selectedValues(assigneeMenuOptions(members, null, "Unassigned")),
    ).toEqual([""]);
  });

  it("marks the assigned member", () => {
    expect(
      selectedValues(assigneeMenuOptions(members, "user-1", "Unassigned")),
    ).toEqual(["user-1"]);
  });

  it("marks nothing when the selection is mixed", () => {
    expect(
      selectedValues(assigneeMenuOptions(members, undefined, "Unassigned")),
    ).toEqual([]);
  });
});
