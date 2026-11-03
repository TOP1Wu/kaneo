import { describe, expect, it } from "vite-plus/test";
import { isCardDone, openCardsFirst } from "./card-progress";

const card = (id: string, ...progress: ("todo" | "doing" | "done")[]) => ({
  id,
  myRoles: progress.map((value, index) => ({
    roleId: `r${index}`,
    roleName: `role ${index}`,
    progress: value,
  })),
});

describe("isCardDone", () => {
  it("needs every role of the person done", () => {
    expect(isCardDone(card("a", "done", "done"))).toBe(true);
    expect(isCardDone(card("b", "done", "doing"))).toBe(false);
    expect(isCardDone(card("c"))).toBe(false);
  });
});

describe("openCardsFirst", () => {
  it("moves finished cards to the end and keeps the rest in order", () => {
    const cards = [
      card("done-1", "done"),
      card("open-1", "doing"),
      card("done-2", "done"),
      card("open-2", "todo"),
    ];
    expect(openCardsFirst(cards).map((entry) => entry.id)).toEqual([
      "open-1",
      "open-2",
      "done-1",
      "done-2",
    ]);
  });
});
