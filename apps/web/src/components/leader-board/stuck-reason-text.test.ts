import { describe, expect, it } from "vite-plus/test";
import { stuckReasonText } from "./stuck-reason-text";

const zh: Record<string, string> = {
  "workspace:leaderBoard.stuck.overdue": "已逾期",
  "workspace:leaderBoard.stuck.idle": "停滞 {{count}} 天",
  "workspace:leaderBoard.stuck.lastRole": "只差{{role}}",
  "workspace:leaderBoard.stuck.lastRoleUnknown": "只差最后一个角色",
};
const t = (key: string, options: Record<string, unknown> = {}) =>
  (zh[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) =>
    String(options[name]),
  );

const card = (overrides: Partial<Parameters<typeof stuckReasonText>[0]>) => ({
  stuck: true,
  stuckReason: null,
  stuckDays: null,
  myRoles: [],
  ...overrides,
});

describe("stuckReasonText", () => {
  it("explains each stuck reason", () => {
    expect(
      stuckReasonText(card({ stuckReason: "overdue", stuckDays: 2 }), t),
    ).toBe("已逾期");
    expect(
      stuckReasonText(card({ stuckReason: "idle", stuckDays: 9 }), t),
    ).toBe("停滞 9 天");
    expect(
      stuckReasonText(
        card({
          stuckReason: "last_role",
          myRoles: [
            { roleName: "产品", progress: "done" },
            { roleName: "测试", progress: "doing" },
          ],
        }),
        t,
      ),
    ).toBe("只差测试");
  });

  it("falls back when the role list is empty", () => {
    expect(stuckReasonText(card({ stuckReason: "last_role" }), t)).toBe(
      "只差最后一个角色",
    );
  });

  it("says nothing for cards that are not stuck", () => {
    expect(
      stuckReasonText(card({ stuck: false, stuckReason: "overdue" }), t),
    ).toBeNull();
    expect(stuckReasonText(card({ stuckReason: null }), t)).toBeNull();
  });
});
