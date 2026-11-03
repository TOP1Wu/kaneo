import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_STUCK_DAYS,
  evaluateStuck,
  isPastDue,
  type MemberState,
  mostBehind,
  stuckThresholdDays,
} from "./stuck";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-10T08:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);
const member = (
  userId: string,
  roleId: string | null,
  progress: MemberState["progress"],
  updatedDaysAgo = 0,
): MemberState => ({
  userId,
  roleId,
  progress,
  updatedAt: daysAgo(updatedDaysAgo),
});

describe("isPastDue", () => {
  it("counts the whole due day as still on time", () => {
    expect(isPastDue(new Date("2026-11-10T00:00:00.000Z"), now)).toBe(false);
    expect(isPastDue(new Date("2026-11-09T00:00:00.000Z"), now)).toBe(true);
    expect(isPastDue(null, now)).toBe(false);
  });
});

describe("evaluateStuck: overdue", () => {
  const dueDate = new Date("2026-11-01T00:00:00.000Z");

  it("flags unfinished members of an overdue task and skips done ones", () => {
    const verdicts = evaluateStuck(
      {
        dueDate,
        members: [member("a", "dev", "doing", 2), member("b", "qa", "done", 1)],
      },
      now,
      7,
    );
    expect(verdicts.get("a")).toEqual({ reason: "overdue", days: 2 });
    expect(verdicts.get("b")).toEqual({ reason: null, days: null });
  });

  it("wins over idle", () => {
    const verdicts = evaluateStuck(
      { dueDate, members: [member("a", "dev", "doing", 30)] },
      now,
      7,
    );
    expect(verdicts.get("a")).toEqual({ reason: "overdue", days: 30 });
  });
});

describe("evaluateStuck: idle", () => {
  it("flags doing rows unchanged for more than the threshold", () => {
    const verdicts = evaluateStuck(
      {
        dueDate: null,
        members: [
          member("idle", "dev", "doing", 8),
          member("edge", "dev", "doing", 7),
          member("waiting", "dev", "todo", 30),
        ],
      },
      now,
      7,
    );
    expect(verdicts.get("idle")).toEqual({ reason: "idle", days: 8 });
    expect(verdicts.get("edge")?.reason).toBeNull();
    expect(verdicts.get("waiting")?.reason).toBeNull();
  });

  it("counts days from the rows that are stuck, not finished ones", () => {
    const verdicts = evaluateStuck(
      {
        dueDate: null,
        members: [
          member("a", "dev", "doing", 10),
          member("a", "qa", "done", 3),
          member("b", "dev", "doing", 12),
          member("b", "qa", "doing", 9),
        ],
      },
      now,
      7,
    );
    expect(verdicts.get("a")).toEqual({ reason: "idle", days: 10 });
    expect(verdicts.get("b")).toEqual({ reason: "idle", days: 9 });
  });
});

describe("evaluateStuck: last_role", () => {
  it("flags the unfinished members of the only open role", () => {
    const verdicts = evaluateStuck(
      {
        dueDate: null,
        members: [
          member("p", "product", "done"),
          member("d", "dev", "done"),
          member("q1", "qa", "todo", 4),
          member("q2", "qa", "done"),
        ],
      },
      now,
      7,
    );
    expect(verdicts.get("q1")).toEqual({ reason: "last_role", days: 4 });
    expect(verdicts.get("q2")?.reason).toBeNull();
    expect(verdicts.get("p")?.reason).toBeNull();
  });

  it("needs at least two roles and exactly one open", () => {
    const single = evaluateStuck(
      { dueDate: null, members: [member("a", "dev", "todo")] },
      now,
      7,
    );
    expect(single.get("a")?.reason).toBeNull();

    const twoOpen = evaluateStuck(
      {
        dueDate: null,
        members: [
          member("a", "dev", "todo"),
          member("b", "qa", "doing"),
          member("c", "product", "done"),
        ],
      },
      now,
      7,
    );
    expect(twoOpen.get("a")?.reason).toBeNull();
    expect(twoOpen.get("b")?.reason).toBeNull();
  });

  it("ignores role-less rows when finding the last role", () => {
    const verdicts = evaluateStuck(
      {
        dueDate: null,
        members: [
          member("assignee", null, "todo"),
          member("d", "dev", "done"),
          member("q", "qa", "todo"),
        ],
      },
      now,
      7,
    );
    expect(verdicts.get("q")?.reason).toBe("last_role");
    expect(verdicts.get("assignee")?.reason).toBeNull();
  });
});

describe("mostBehind", () => {
  it("returns the least advanced progress", () => {
    expect(mostBehind(["done", "doing"])).toBe("doing");
    expect(mostBehind(["doing", "todo", "done"])).toBe("todo");
    expect(mostBehind(["done"])).toBe("done");
  });
});

describe("stuckThresholdDays", () => {
  it("reads a positive integer and falls back to the default", () => {
    expect(stuckThresholdDays("3")).toBe(3);
    expect(stuckThresholdDays(" 14 ")).toBe(14);
    expect(stuckThresholdDays(undefined)).toBe(DEFAULT_STUCK_DAYS);
    expect(stuckThresholdDays("0")).toBe(DEFAULT_STUCK_DAYS);
    expect(stuckThresholdDays("-2")).toBe(DEFAULT_STUCK_DAYS);
    expect(stuckThresholdDays("1.5")).toBe(DEFAULT_STUCK_DAYS);
    expect(stuckThresholdDays("abc")).toBe(DEFAULT_STUCK_DAYS);
  });
});
