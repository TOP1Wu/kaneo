import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { TaskMemberSummary } from "@/fetchers/task-member/get-task-member-summaries";
import { TaskMemberProgressLine } from "./task-member-progress-line";
import { TaskMemberSummaryContext } from "./task-member-summary-context";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const role = (
  roleId: string,
  roleName: string,
  done: number,
  total: number,
) => ({
  roleId,
  roleName,
  roleSlug: roleId,
  done,
  total,
});

function renderLine(summary: TaskMemberSummary | undefined) {
  const map = new Map(summary ? [[summary.taskId, summary]] : []);
  return render(
    <TaskMemberSummaryContext.Provider value={map}>
      <TaskMemberProgressLine taskId="t1" />
    </TaskMemberSummaryContext.Provider>,
  );
}

describe("TaskMemberProgressLine", () => {
  it("shows per-role counts from the board batch", () => {
    const { container } = renderLine({
      taskId: "t1",
      summary: [
        role("p", "产品", 2, 2),
        role("d", "开发", 1, 3),
        role("q", "测试", 0, 2),
      ],
      readyForReview: false,
    });
    expect(container.textContent).toContain("产品 2/2·开发 1/3·测试 0/2");
    expect(screen.queryByText("tasks:members.readyForReview")).toBeNull();
  });

  it("adds the ready badge when everyone is done", () => {
    renderLine({
      taskId: "t1",
      summary: [role("d", "开发", 2, 2)],
      readyForReview: true,
    });
    expect(screen.getByText("tasks:members.readyForReview")).toBeTruthy();
  });

  it("renders nothing for a task without members", () => {
    const { container } = renderLine(undefined);
    expect(container.textContent).toBe("");
  });
});
