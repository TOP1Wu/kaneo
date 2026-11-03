import { describe, expect, it } from "vite-plus/test";
import { percent } from "./chart-helpers";

describe("percent", () => {
  it("rounds and survives an empty total", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
