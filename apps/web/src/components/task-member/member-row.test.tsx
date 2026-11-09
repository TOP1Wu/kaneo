import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { TaskMember } from "@/fetchers/task-member/get-task-members";
import { MemberRow } from "./member-row";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));

vi.mock("@/lib/format", () => ({
  formatDateShort: (value: string) => value.slice(0, 10),
}));

afterEach(cleanup);

const member: TaskMember = {
  id: "m1",
  taskId: "t1",
  userId: "u-qa",
  userName: "王悦",
  userImage: null,
  roleId: "r-qa",
  roleName: "测试",
  roleSlug: "qa",
  isOwnerRole: false,
  progress: "doing",
  startedAt: "2026-11-01T00:00:00.000Z",
  doneAt: null,
  note: null,
  position: 0,
  updatedBy: "u-qa",
};

const candidates = [
  { id: "u-qa", name: "王悦", email: null, image: null },
  { id: "u-dev", name: "李雷", email: null, image: null },
];

function renderRow(
  canEdit: boolean,
  canManage = false,
  onChangePerson = vi.fn(),
) {
  render(
    <MemberRow
      member={member}
      isSelf={false}
      access={{ canEdit, onBehalf: canEdit }}
      canManage={canManage}
      roles={[]}
      candidates={candidates}
      onProgress={vi.fn()}
      onChangeRole={vi.fn()}
      onChangePerson={onChangePerson}
      onRemove={vi.fn()}
    />,
  );
  return screen.getByRole("combobox", { name: /tasks:members.progressFor/ });
}

describe("MemberRow", () => {
  it("disables someone else's progress without permission and explains why", () => {
    const select = renderRow(false);
    expect(select).toHaveAttribute("data-disabled");
    // The reason is a hover tooltip and the control's accessible description.
    expect(select.closest("[data-slot=tooltip-trigger]")).not.toBeNull();
    expect(select).toHaveAccessibleDescription("tasks:members.noPermission");
  });

  it("enables progress when the viewer may edit it", () => {
    const select = renderRow(true);
    expect(select).not.toHaveAttribute("data-disabled");
    expect(select.closest("[data-slot=tooltip-trigger]")).toBeNull();
    expect(select).not.toHaveAccessibleDescription();
  });

  it("shows member actions only to people who manage members", () => {
    renderRow(true, false);
    expect(
      screen.queryByRole("button", { name: /tasks:members.actionsFor/ }),
    ).toBeNull();
    cleanup();
    renderRow(true, true);
    expect(
      screen.getByRole("button", { name: /tasks:members.actionsFor/ }),
    ).toBeTruthy();
  });

  it("lets a manager hand the seat to someone else from the name", () => {
    const onChangePerson = vi.fn();
    // Someone else's row can still be reassigned by a member manager.
    renderRow(false, true, onChangePerson);
    fireEvent.click(
      screen.getByRole("button", { name: /tasks:members.changePersonFor/ }),
    );
    const option = screen
      .getAllByRole("option")
      .find((item) => item.textContent?.includes("李雷"));
    expect(option).toBeTruthy();
    fireEvent.click(option as HTMLElement);
    expect(onChangePerson).toHaveBeenCalledWith(member, "u-dev");
  });

  it("does not open a person picker without member management", () => {
    renderRow(true, false);
    expect(
      screen.queryByRole("button", { name: /tasks:members.changePersonFor/ }),
    ).toBeNull();
  });
});
