import { describe, expect, it } from "vite-plus/test";
import { meFirst } from "./me-first";

const people = [{ userId: "a" }, { userId: "b" }, { userId: "c" }];

describe("meFirst", () => {
  it("puts me first and keeps the rest in order", () => {
    expect(meFirst(people, "b").map((person) => person.userId)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("leaves the order alone when I'm not on the board", () => {
    expect(meFirst(people, "z")).toEqual(people);
    expect(meFirst(people, undefined)).toEqual(people);
  });
});
