import { describe, expect, it } from "vite-plus/test";
import { percent, statusColors } from "./chart-helpers";

describe("statusColors", () => {
  it("gives each status one color, in first-seen order", () => {
    const colors = statusColors(["to-do", "done", "to-do", "in-progress"]);
    expect([...colors.keys()]).toEqual(["to-do", "done", "in-progress"]);
    expect(colors.get("to-do")).toBe("bg-chart-1");
    expect(colors.get("in-progress")).toBe("bg-chart-3");
  });
});

describe("percent", () => {
  it("rounds and survives an empty total", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
