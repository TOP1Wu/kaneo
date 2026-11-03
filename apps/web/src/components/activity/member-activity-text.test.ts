import { describe, expect, it } from "vite-plus/test";
import {
  describeMemberActivity,
  isMemberActivity,
} from "./member-activity-text";

const zh: Record<string, string> = {
  "activity:member.added": "添加了 {{name}}（{{role}}）",
  "activity:member.removed": "移除了 {{name}}（{{role}}）",
  "activity:member.roleChanged": "把 {{name}} 的角色从 {{from}} 改为 {{to}}",
  "activity:member.progressSelf": "将{{role}}进度{{progress}}",
  "activity:member.progressOnBehalf": "代 {{name}}（{{role}}）{{progress}}",
  "activity:member.readyForReview": "完成了最后一个环节，任务可验收",
  "activity:member.progress.done": "标记完成",
  "activity:member.progress.doing": "标记进行中",
  "activity:member.progress.todo": "标记未开始",
};

const t = (key: string, options: Record<string, unknown> = {}) =>
  (zh[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) =>
    String(options[name]),
  );

const base = { memberUserName: "胡楠", roleName: "开发" };

describe("describeMemberActivity", () => {
  it("names who acted for whom on an on-behalf edit", () => {
    expect(
      describeMemberActivity(
        "member_progress_changed",
        { ...base, from: "doing", to: "done", onBehalfOf: true },
        t,
      ),
    ).toBe("代 胡楠（开发）标记完成");
  });

  it("describes a member's own progress change", () => {
    expect(
      describeMemberActivity(
        "member_progress_changed",
        { ...base, from: "todo", to: "doing", onBehalfOf: false },
        t,
      ),
    ).toBe("将开发进度标记进行中");
  });

  it("covers adding, removing, role changes, and the ready moment", () => {
    expect(describeMemberActivity("member_added", base, t)).toBe(
      "添加了 胡楠（开发）",
    );
    expect(describeMemberActivity("member_removed", base, t)).toBe(
      "移除了 胡楠（开发）",
    );
    expect(
      describeMemberActivity(
        "member_role_changed",
        { ...base, from: "开发", to: "测试" },
        t,
      ),
    ).toBe("把 胡楠 的角色从 开发 改为 测试");
    expect(describeMemberActivity("task_ready_for_review", base, t)).toBe(
      "完成了最后一个环节，任务可验收",
    );
  });

  it("keeps rendering when event data is missing", () => {
    expect(describeMemberActivity("member_added", null, t)).toBe(
      "添加了 ?（?）",
    );
  });

  it("recognises only member activity types", () => {
    expect(isMemberActivity("member_added")).toBe(true);
    expect(isMemberActivity("status_changed")).toBe(false);
  });
});
