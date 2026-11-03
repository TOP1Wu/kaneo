import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import type { TaskMembers } from "@/fetchers/task-member/get-task-members";
import { useUpdateTaskMember } from "./use-update-task-member";

const update = vi.hoisted(() => vi.fn());
vi.mock("@/fetchers/task-member/update-task-member", () => ({
  default: update,
}));

const view: TaskMembers = {
  members: [
    {
      id: "m1",
      taskId: "t1",
      userId: "u1",
      userName: "李响",
      userImage: null,
      roleId: "dev",
      roleName: "开发",
      roleSlug: "dev",
      isOwnerRole: false,
      progress: "doing",
      startedAt: null,
      doneAt: null,
      note: null,
      position: 0,
      updatedBy: "u1",
    },
  ],
  summary: [
    { roleId: "dev", roleName: "开发", roleSlug: "dev", total: 1, done: 0 },
  ],
  readyForReview: false,
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  queryClient.setQueryData(["task-members", "t1"], view);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdateTaskMember(), { wrapper });
  const progress = () =>
    queryClient.getQueryData<TaskMembers>(["task-members", "t1"])?.members[0]
      ?.progress;
  return { result, progress };
}

describe("useUpdateTaskMember", () => {
  it("shows the new progress at once and rolls back when the API refuses", async () => {
    let reject: (error: Error) => void = () => {};
    update.mockReturnValueOnce(new Promise((_, fail) => (reject = fail)));
    const { result, progress } = setup();

    act(() => {
      result.current.mutate({
        memberId: "m1",
        taskId: "t1",
        body: { progress: "done" },
      });
    });
    await waitFor(() => expect(progress()).toBe("done"));

    act(() =>
      reject(new Error("You can only update your own progress on this task")),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(progress()).toBe("doing");
  });

  it("keeps the server's member list on success", async () => {
    update.mockResolvedValueOnce({
      ...view,
      members: [
        {
          ...view.members[0],
          progress: "done",
          doneAt: "2026-11-03T00:00:00.000Z",
        },
      ],
      readyForReview: true,
    });
    const { result, progress } = setup();

    act(() => {
      result.current.mutate({
        memberId: "m1",
        taskId: "t1",
        body: { progress: "done" },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(progress()).toBe("done");
  });
});
