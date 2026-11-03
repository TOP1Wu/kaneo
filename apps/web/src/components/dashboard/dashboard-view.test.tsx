import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { PROGRESS_TONE } from "@/lib/task-member/progress-tone";
import { DashboardView } from "./dashboard-view";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));

afterEach(cleanup);

// Fifteen tasks; one person holds two roles on several of them. The API has
// already counted each person once per task, so the page must not re-add.
const data: Dashboard = {
  totals: {
    tasks: 15,
    overdue: 3,
    readyForReview: 2,
    stuck: 4,
    byStatus: [
      { status: "to-do", statusName: "To Do", isFinal: false, count: 6 },
      {
        status: "in-progress",
        statusName: "In Progress",
        isFinal: false,
        count: 7,
      },
      { status: "done", statusName: "Done", isFinal: true, count: 2 },
    ],
  },
  workload: [
    { userId: "u1", userName: "胡楠", todo: 2, doing: 5, done: 1 },
    { userId: "u2", userName: "王悦", todo: 4, doing: 0, done: 3 },
  ],
  byProject: [
    {
      projectId: "p1",
      projectName: "官网改版",
      byStatus: [
        { status: "to-do", statusName: "To Do", isFinal: false, count: 6 },
        { status: "done", statusName: "Done", isFinal: true, count: 2 },
      ],
    },
  ],
  roleCompletion: [
    { roleId: "r1", roleName: "开发", total: 8, done: 2 },
    { roleId: "r2", roleName: "测试", total: 0, done: 0 },
  ],
  stuckList: [
    {
      taskId: "t1",
      ticket: "web-1",
      title: "首页改版",
      projectId: "p1",
      projectName: "官网改版",
      stuckReason: "overdue",
      stuckDays: 3,
      blockedBy: [
        { userId: "u1", userName: "胡楠", roleName: "开发" },
        { userId: "u2", userName: "王悦", roleName: "测试" },
      ],
    },
  ],
};

describe("DashboardView", () => {
  it("renders the API's de-duplicated totals as given", () => {
    render(<DashboardView data={data} onOpenTask={vi.fn()} />);
    const total = screen.getByText(
      "workspace:dashboard.totals.tasks",
    ).parentElement;
    expect(total?.textContent).toContain("15");
    // The per-person totals are each person's own task count, not role rows.
    const workload = screen.getByRole("region", {
      name: "workspace:dashboard.workload.title",
    });
    const rows = within(workload).getAllByRole("img");
    expect(rows[0]).toHaveAccessibleName(expect.stringContaining('"total":8'));
    expect(rows[1]).toHaveAccessibleName(expect.stringContaining('"total":7'));
  });

  it("colors personal progress with the shared tones", () => {
    render(<DashboardView data={data} onOpenTask={vi.fn()} />);
    const workload = screen.getByRole("region", {
      name: "workspace:dashboard.workload.title",
    });
    for (const key of ["done", "doing", "todo"] as const) {
      const segment = workload.querySelector(`[data-progress="${key}"]`);
      expect(segment).toHaveClass(PROGRESS_TONE[key].bar);
    }
    const meter = screen.getByRole("meter").firstElementChild;
    expect(meter).toHaveClass(PROGRESS_TONE.done.bar);
  });

  it("greens only the final column in the project chart", () => {
    render(<DashboardView data={data} onOpenTask={vi.fn()} />);
    const chart = screen.getByRole("region", {
      name: "workspace:dashboard.byProject.title",
    });
    const segments = [
      ...chart.querySelectorAll<HTMLElement>("[role=img] span"),
    ].map((segment) => segment.className);
    expect(segments).toHaveLength(2);
    expect(segments[1]).toBe(PROGRESS_TONE.done.bar);
    expect(segments[0]).not.toMatch(/success|info|blue|green|emerald/);
  });

  it("hides roles without members from the completion chart", () => {
    render(<DashboardView data={data} onOpenTask={vi.fn()} />);
    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(1);
    expect(meters[0]).toHaveAttribute("aria-valuenow", "25");
  });

  it("opens a stuck task with its project", () => {
    const onOpenTask = vi.fn();
    render(<DashboardView data={data} onOpenTask={onOpenTask} />);
    expect(screen.getByText("胡楠（开发）、王悦（测试）")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /首页改版/ }));
    expect(onOpenTask).toHaveBeenCalledWith({ taskId: "t1", projectId: "p1" });
  });
});
