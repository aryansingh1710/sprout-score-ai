import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("extracts from Error instances", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });
  it("returns strings as-is", () => {
    expect(errorMessage("nope")).toBe("nope");
  });
  it("reads message-like objects", () => {
    expect(errorMessage({ message: "weird" })).toBe("weird");
  });
  it("falls back for null/undefined", () => {
    expect(errorMessage(null)).toBe("Something went wrong");
    expect(errorMessage(undefined, "fb")).toBe("fb");
  });
  it("falls back for empty error", () => {
    expect(errorMessage(new Error(""), "fb")).toBe("fb");
  });
  it("falls back for non-message objects", () => {
    expect(errorMessage({ code: 500 }, "fb")).toBe("fb");
  });
});
