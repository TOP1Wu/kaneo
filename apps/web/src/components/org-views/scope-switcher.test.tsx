import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { OrgUnit } from "@/fetchers/org-unit/get-org-units";
import { scopeOptions } from "@/lib/org-scope/scope-options";
import type { ScopeSelection } from "@/lib/org-scope/scope-query";
import enUS from "@i18n/en-US.json";
import zhCN from "@i18n/zh-CN.json";
import { ScopeSwitcher } from "./scope-switcher";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const units: OrgUnit[] = [
  { id: "eng", parentId: null, name: "研发中心", position: 0, members: [] },
  { id: "mobile", parentId: "eng", name: "移动组", position: 0, members: [] },
  { id: "sales", parentId: null, name: "销售部", position: 1, members: [] },
];

const base = {
  isWorkspaceAdmin: false,
  isInstanceAdmin: false,
  ledSubtreeUnitIds: [] as string[],
  subordinateUserIds: [] as string[],
};

function renderSwitcher(
  scope: typeof base,
  value?: ScopeSelection,
  onChange = vi.fn(),
) {
  const options = scopeOptions(scope, units);
  render(
    <ScopeSwitcher
      options={options}
      units={units}
      value={value ?? options.defaultSelection}
      onChange={onChange}
    />,
  );
  return onChange;
}

const toggleLabels = () =>
  screen.getAllByRole("button").map((button) => button.textContent);
const unitPicker = () =>
  screen.queryByRole("combobox", { name: "workspace:orgViews.scope.pickUnit" });

async function unitChoices() {
  const picker = unitPicker();
  if (!picker) throw new Error("no department picker");
  fireEvent.click(picker, { detail: 1 });
  const options = await screen.findAllByRole("option");
  return options.map((option) => option.textContent);
}

describe("ScopeSwitcher", () => {
  it("labels mine as me and my reports in every source locale", () => {
    expect(enUS.workspace.orgViews.scope.mine).toBe("Me & reports");
    expect(zhCN.workspace.orgViews.scope.mine).toBe("我和下属");
    expect(zhCN.workspace.orgViews.scope.pickUnit).toBe("选择部门");
    expect(zhCN.workspace.leaderBoard.me).toBe("我");
  });

  it("shows only my scope to a member, with no department picker", () => {
    renderSwitcher(base);
    expect(toggleLabels()).toEqual(["workspace:orgViews.scope.mine"]);
    expect(unitPicker()).toBeNull();
  });

  it("offers a leader the departments they lead and their children by name", async () => {
    renderSwitcher({
      ...base,
      ledSubtreeUnitIds: ["eng", "mobile"],
      subordinateUserIds: ["u"],
    });
    // No bare "department" toggle: departments live in the dropdown.
    expect(toggleLabels()).toEqual(["workspace:orgViews.scope.mine"]);
    expect(unitPicker()).toHaveTextContent("workspace:orgViews.scope.pickUnit");
    expect(await unitChoices()).toEqual(["研发中心", "移动组"]);
  });

  it("offers an admin every department and everyone, selected", async () => {
    renderSwitcher({ ...base, isWorkspaceAdmin: true });
    expect(toggleLabels()).toEqual([
      "workspace:orgViews.scope.mine",
      "workspace:orgViews.scope.all",
    ]);
    expect(
      screen.getByRole("button", { name: "workspace:orgViews.scope.all" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await unitChoices()).toEqual(["研发中心", "移动组", "销售部"]);
  });

  it("switches to the picked department and shows its name", async () => {
    const onChange = renderSwitcher({
      ...base,
      ledSubtreeUnitIds: ["eng", "mobile"],
      subordinateUserIds: ["u"],
    });
    await unitChoices();
    const option = screen.getByRole("option", { name: "移动组" });
    fireEvent.pointerDown(option);
    fireEvent.mouseDown(option);
    fireEvent.pointerUp(option);
    fireEvent.mouseUp(option);
    fireEvent.click(option, { detail: 1 });
    expect(onChange).toHaveBeenCalledWith({ scope: "unit", unitId: "mobile" });

    cleanup();
    renderSwitcher(
      {
        ...base,
        ledSubtreeUnitIds: ["eng", "mobile"],
        subordinateUserIds: ["u"],
      },
      { scope: "unit", unitId: "mobile" },
    );
    expect(unitPicker()).toHaveTextContent("移动组");
    expect(
      screen.getByRole("button", { name: "workspace:orgViews.scope.mine" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
