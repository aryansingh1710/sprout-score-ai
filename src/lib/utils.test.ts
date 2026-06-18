import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });
  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
  it("flattens arrays", () => {
    expect(cn(["a", ["b", "c"]])).toBe("a b c");
  });
  it("returns empty string when given nothing", () => {
    expect(cn()).toBe("");
  });
  it("preserves non-conflicting tailwind utilities", () => {
    const result = cn("text-red-500", "font-bold", "p-4");
    expect(result).toContain("text-red-500");
    expect(result).toContain("font-bold");
    expect(result).toContain("p-4");
  });
});
