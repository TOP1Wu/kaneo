import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { OrgUnit } from "@/fetchers/org-unit/get-org-units";
import { scopeOptions } from "@/lib/org-scope/scope-options";
import { ScopeSwitcher } from "./scope-switcher";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const units: OrgUnit[] = [
  { id: "eng", parentId: null, name: "研发中心", position: 0, members: [] },
  { id: "mobile", parentId: "eng", name: "移动组", position: 0, members: [] },
];

const base = {
  isWorkspaceAdmin: false,
  isInstanceAdmin: false,
  leadUnitIds: [] as string[],
  subordinateUserIds: [] as string[],
};

function scopeButtons(scope: typeof base) {
  const options = scopeOptions(scope, units);
  render(
    <ScopeSwitcher
      options={options}
      units={units}
      value={options.defaultSelection}
      onChange={vi.fn()}
    />,
  );
  return screen.getAllByRole("button").map((button) => button.textContent);
}

describe("ScopeSwitcher", () => {
  it("shows only my scope to a member", () => {
    expect(scopeButtons(base)).toEqual(["workspace:orgViews.scope.mine"]);
  });

  it("adds departments for a leader", () => {
    expect(
      scopeButtons({
        ...base,
        leadUnitIds: ["eng"],
        subordinateUserIds: ["u"],
      }),
    ).toEqual([
      "workspace:orgViews.scope.mine",
      "workspace:orgViews.scope.unit",
    ]);
  });

  it("adds everyone for an admin and selects it", () => {
    expect(scopeButtons({ ...base, isWorkspaceAdmin: true })).toEqual([
      "workspace:orgViews.scope.mine",
      "workspace:orgViews.scope.unit",
      "workspace:orgViews.scope.all",
    ]);
    expect(
      screen.getByRole("button", { name: "workspace:orgViews.scope.all" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
