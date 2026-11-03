import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  LeaderBoardCard,
  LeaderBoardPerson,
} from "@/fetchers/leader-board/get-leader-board";
import { PROGRESS_TONE } from "@/lib/task-member/progress-tone";
import { LeaderBoardColumn } from "./leader-board-column";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));
vi.mock("@/components/my-work/due-date-text", () => ({
  DueDateText: () => null,
}));

afterEach(cleanup);

const card = (
  taskId: string,
  progress: LeaderBoardCard["myRoles"][number]["progress"],
): LeaderBoardCard => ({
  taskId,
  ticket: taskId,
  title: `Task ${taskId}`,
  projectId: "p1",
  projectName: "官网改版",
  priority: "medium",
  dueDate: null,
  status: "to-do",
  statusName: "To Do",
  myRoles: [{ roleId: "dev", roleName: "开发", progress }],
  stuck: false,
  stuckReason: null,
  stuckDays: null,
});

const person: LeaderBoardPerson = {
  userId: "me",
  userName: "何欣",
  userImage: null,
  unitNames: ["研发中心"],
  counts: { doing: 1, overdue: 0, stuck: 0, total: 3 },
  cards: [
    card("done-1", "done"),
    card("doing-1", "doing"),
    card("todo-1", "todo"),
  ],
};

const renderColumn = (isMe = false) =>
  render(<LeaderBoardColumn person={person} isMe={isMe} onOpen={vi.fn()} />);

const cardButtons = () => [
  ...document.querySelectorAll<HTMLElement>("[data-task-id]"),
];

describe("LeaderBoardColumn", () => {
  it("colors each progress tag with the shared tones", () => {
    renderColumn();
    for (const key of ["done", "doing", "todo"] as const) {
      const tag = document.querySelector(`[data-progress="${key}"]`);
      for (const token of PROGRESS_TONE[key].badge.split(" ")) {
        expect(tag).toHaveClass(token);
      }
    }
  });

  it("puts this person's finished cards last and dims them", () => {
    renderColumn();
    const cards = cardButtons();
    expect(cards.map((entry) => entry.dataset.taskId)).toEqual([
      "doing-1",
      "todo-1",
      "done-1",
    ]);
    expect(cards[2]).toHaveAttribute("data-done", "true");
    expect(cards[2]?.className).toMatch(/opacity-55/);
    expect(cards[0]).not.toHaveAttribute("data-done");
  });

  it("marks my own column", () => {
    renderColumn(true);
    expect(screen.getByText("workspace:leaderBoard.me")).toBeTruthy();
    expect(
      screen.getByRole("region", {
        name: 'workspace:leaderBoard.meColumn {"name":"何欣"}',
      }),
    ).toBeTruthy();
  });

  it("leaves other columns unmarked", () => {
    renderColumn(false);
    expect(screen.queryByText("workspace:leaderBoard.me")).toBeNull();
    expect(screen.getByRole("region", { name: "何欣" })).toBeTruthy();
  });
});
