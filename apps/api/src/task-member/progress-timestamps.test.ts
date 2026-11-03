import { describe, expect, it } from "vite-plus/test";
import { progressTimestamps } from "./progress-timestamps";

const now = new Date("2026-11-03T10:00:00.000Z");
const earlier = new Date("2026-11-01T10:00:00.000Z");

describe("progressTimestamps", () => {
  it("stamps startedAt once when work starts", () => {
    expect(
      progressTimestamps(
        "todo",
        "doing",
        { startedAt: null, doneAt: null },
        now,
      ),
    ).toEqual({ startedAt: now, doneAt: null });
    expect(
      progressTimestamps(
        "todo",
        "doing",
        { startedAt: earlier, doneAt: null },
        now,
      ),
    ).toEqual({ startedAt: earlier, doneAt: null });
  });

  it("stamps doneAt and backfills startedAt when finishing", () => {
    expect(
      progressTimestamps(
        "todo",
        "done",
        { startedAt: null, doneAt: null },
        now,
      ),
    ).toEqual({ startedAt: now, doneAt: now });
  });

  it("clears doneAt when a done member withdraws", () => {
    expect(
      progressTimestamps(
        "done",
        "doing",
        { startedAt: earlier, doneAt: earlier },
        now,
      ),
    ).toEqual({ startedAt: earlier, doneAt: null });
    expect(
      progressTimestamps(
        "done",
        "todo",
        { startedAt: earlier, doneAt: earlier },
        now,
      ),
    ).toEqual({ startedAt: earlier, doneAt: null });
  });

  it("leaves timestamps alone when progress is unchanged", () => {
    const stamps = { startedAt: earlier, doneAt: earlier };
    expect(progressTimestamps("done", "done", stamps, now)).toBe(stamps);
  });
});
