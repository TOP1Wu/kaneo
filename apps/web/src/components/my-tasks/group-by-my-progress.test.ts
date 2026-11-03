import { describe, expect, it } from "vite-plus/test";
import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import {
  groupAssignedTasksByMyProgress,
  myProgressBucket,
} from "./group-by-my-progress";

type Progress = "todo" | "doing" | "done";

function task(id: string, progress: Progress[]): AssignedTask {
  return {
    id,
    projectId: "p",
    number: 1,
    title: id,
    status: "to-do",
    statusName: "To Do",
    statusIcon: null,
    priority: "medium",
    dueDate: null,
    projectName: "P",
    projectSlug: "P",
    projectIcon: null,
    labels: [],
    myRoles: progress.map((value, index) => ({
      memberId: `${id}-${index}`,
      roleId: `role-${index}`,
      roleName: `Role ${index}`,
      progress: value,
    })),
  };
}

describe("myProgressBucket", () => {
  it("uses the furthest-behind of my roles", () => {
    expect(myProgressBucket(task("a", ["done", "todo"]))).toBe("todo");
    expect(myProgressBucket(task("b", ["done", "doing"]))).toBe("doing");
    expect(myProgressBucket(task("c", ["done"]))).toBe("done");
    expect(myProgressBucket(task("d", []))).toBe("assigneeOnly");
  });
});

describe("groupAssignedTasksByMyProgress", () => {
  it("orders groups doing, todo, done, then assignee only, and skips empty ones", () => {
    const groups = groupAssignedTasksByMyProgress([
      task("a", ["todo"]),
      task("b", []),
      task("c", ["doing"]),
      task("d", ["todo"]),
    ]);
    expect(
      groups.map((group) => [group.progress, group.tasks.map((t) => t.id)]),
    ).toEqual([
      ["doing", ["c"]],
      ["todo", ["a", "d"]],
      ["assigneeOnly", ["b"]],
    ]);
  });
});
