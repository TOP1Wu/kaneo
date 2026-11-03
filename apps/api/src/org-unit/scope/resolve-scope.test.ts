import { describe, expect, it } from "vite-plus/test";
import { resolveScope, type ScopeFacts, trustedPeople } from "./resolve-scope";

const member: ScopeFacts = {
  actorId: "me",
  isWorkspaceAdmin: false,
  isInstanceAdmin: false,
  ledSubtreeUnitIds: [],
  unitExists: true,
};
const leader: ScopeFacts = { ...member, ledSubtreeUnitIds: ["root", "child"] };
const workspaceAdmin: ScopeFacts = { ...member, isWorkspaceAdmin: true };
const instanceAdmin: ScopeFacts = { ...member, isInstanceAdmin: true };

describe("resolveScope", () => {
  it("lets everyone use mine", () => {
    for (const facts of [member, leader, workspaceAdmin, instanceAdmin]) {
      expect(resolveScope("mine", undefined, facts).ok).toBe(true);
    }
  });

  it("limits all to workspace and instance admins", () => {
    expect(resolveScope("all", undefined, member)).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(resolveScope("all", undefined, leader)).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(resolveScope("all", undefined, workspaceAdmin)).toEqual({
      ok: true,
      privileged: true,
    });
    expect(resolveScope("all", undefined, instanceAdmin)).toEqual({
      ok: true,
      privileged: true,
    });
  });

  it("lets leaders of a unit or its ancestors use unit", () => {
    expect(resolveScope("unit", "root", leader)).toEqual({
      ok: true,
      privileged: false,
    });
    // "child" is in the subtree because the leader leads its parent.
    expect(resolveScope("unit", "child", leader)).toEqual({
      ok: true,
      privileged: false,
    });
    expect(resolveScope("unit", "elsewhere", leader)).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(resolveScope("unit", "root", member)).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("lets admins use any unit", () => {
    expect(resolveScope("unit", "any", workspaceAdmin).ok).toBe(true);
    expect(resolveScope("unit", "any", instanceAdmin).ok).toBe(true);
  });

  it("needs an existing unitId for unit", () => {
    expect(resolveScope("unit", undefined, workspaceAdmin)).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      resolveScope("unit", "gone", { ...workspaceAdmin, unitExists: false }),
    ).toMatchObject({ ok: false, status: 404 });
  });
});

describe("trustedPeople", () => {
  const people = ["me", "a", "b"];

  it("never trusts the actor's own participation in mine", () => {
    expect(trustedPeople("mine", false, "me", people)).toEqual(["a", "b"]);
    expect(trustedPeople("mine", true, "me", people)).toEqual(["a", "b"]);
  });

  it("trusts a leader's unit members but not the leader", () => {
    expect(trustedPeople("unit", false, "me", people)).toEqual(["a", "b"]);
  });

  it("trusts everyone in admin-wide views", () => {
    expect(trustedPeople("unit", true, "me", people)).toEqual(people);
    expect(trustedPeople("all", true, "me", people)).toEqual(people);
  });
});
