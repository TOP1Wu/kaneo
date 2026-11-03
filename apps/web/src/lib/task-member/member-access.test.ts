import { describe, expect, it } from "vite-plus/test";
import {
  canManageMembers,
  type MemberViewer,
  progressAccess,
} from "./member-access";

const owner = { userId: "lead", isOwnerRole: true };
const dev = { userId: "dev", isOwnerRole: false };
const qa = { userId: "qa", isOwnerRole: false };
const members = [owner, dev, qa];

const viewer = (overrides: Partial<MemberViewer>): MemberViewer => ({
  userId: "dev",
  canUpdateTasks: false,
  canManageSettings: false,
  subordinateUserIds: [],
  ...overrides,
});

describe("progressAccess", () => {
  it("lets members change only their own row", () => {
    expect(progressAccess(dev, members, viewer({}))).toEqual({
      canEdit: true,
      onBehalf: false,
    });
    expect(progressAccess(qa, members, viewer({}))).toEqual({
      canEdit: false,
      onBehalf: false,
    });
  });

  it("treats owner, admin, and leader edits as on behalf", () => {
    for (const who of [
      viewer({ userId: "lead" }),
      viewer({ userId: "admin", canManageSettings: true }),
      viewer({ userId: "boss", subordinateUserIds: ["qa"] }),
    ]) {
      expect(progressAccess(qa, members, who)).toEqual({
        canEdit: true,
        onBehalf: true,
      });
    }
  });

  it("does not grant progress edits for task:update alone", () => {
    expect(
      progressAccess(qa, members, viewer({ canUpdateTasks: true })).canEdit,
    ).toBe(false);
  });

  it("disables everything while signed out", () => {
    expect(progressAccess(dev, members, viewer({ userId: undefined }))).toEqual(
      { canEdit: false, onBehalf: false },
    );
  });
});

describe("canManageMembers", () => {
  it("allows task updaters, admins, and the primary owner", () => {
    expect(canManageMembers(members, viewer({}))).toBe(false);
    expect(canManageMembers(members, viewer({ canUpdateTasks: true }))).toBe(
      true,
    );
    expect(canManageMembers(members, viewer({ canManageSettings: true }))).toBe(
      true,
    );
    expect(canManageMembers(members, viewer({ userId: "lead" }))).toBe(true);
  });
});
