import { describe, expect, it } from "vite-plus/test";
import { PROGRESS_TONE, PROGRESS_TRACK, statusTones } from "./progress-tone";

describe("PROGRESS_TONE", () => {
  it("maps done to success, doing to info, todo to neutral", () => {
    expect(PROGRESS_TONE.done.bar).toBe("bg-success");
    expect(PROGRESS_TONE.doing.bar).toBe("bg-info");
    expect(PROGRESS_TONE.todo.bar).toMatch(/neutral/);
    expect(PROGRESS_TONE.todo.bar).not.toBe(PROGRESS_TRACK);
  });
});

describe("statusTones", () => {
  it("greens only final columns and never uses blue for a status", () => {
    const tones = statusTones([
      { status: "to-do", isFinal: false },
      { status: "in-progress", isFinal: false },
      { status: "to-do", isFinal: false },
      { status: "done", isFinal: true },
      { status: "in-review", isFinal: false },
    ]);
    expect([...tones.keys()]).toEqual([
      "to-do",
      "in-progress",
      "done",
      "in-review",
    ]);
    expect(tones.get("done")).toBe(PROGRESS_TONE.done.bar);
    const others = ["to-do", "in-progress", "in-review"].map((status) =>
      tones.get(status),
    );
    expect(new Set(others).size).toBe(3);
    for (const tone of others) {
      expect(tone).toMatch(/neutral/);
      expect(tone).not.toMatch(/success|info|blue|green|emerald/);
    }
  });
});
