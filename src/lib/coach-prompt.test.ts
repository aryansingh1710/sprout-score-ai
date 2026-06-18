import { describe, it, expect } from "vitest";
import {
  sanitizeCoachMessage,
  buildCoachSystemPrompt,
  averageDailyFootprint,
  topCategory,
  type CoachContextEntry,
} from "./coach-prompt";

const entry = (over: Partial<CoachContextEntry> = {}): CoachContextEntry => ({
  entry_date: "2026-06-18",
  total_kg: 10,
  transportation_kg: 4,
  electricity_kg: 2,
  food_kg: 2,
  shopping_kg: 1,
  waste_kg: 1,
  ...over,
});

describe("sanitizeCoachMessage", () => {
  it("collapses whitespace and trims", () => {
    expect(sanitizeCoachMessage("  hello\n\n  world  ")).toBe("hello world");
  });
  it("caps length at 1000", () => {
    expect(sanitizeCoachMessage("x".repeat(2000))).toHaveLength(1000);
  });
  it("returns empty string for whitespace only", () => {
    expect(sanitizeCoachMessage("   \n\t  ")).toBe("");
  });
});

describe("buildCoachSystemPrompt", () => {
  it("includes profile and entries as JSON", () => {
    const s = buildCoachSystemPrompt({ display_name: "Ada", weekly_goal_kg: 60, streak_days: 4 }, [entry()]);
    expect(s).toContain("Ada");
    expect(s).toContain("\"weekly_goal_kg\":60");
    expect(s).toContain("2026-06-18");
  });
  it("handles null profile gracefully", () => {
    const s = buildCoachSystemPrompt(null, []);
    expect(s).toContain("User profile: {}");
    expect(s).toContain("[]");
  });
  it("truncates to last 14 entries", () => {
    const many = Array.from({ length: 30 }, () => entry());
    const s = buildCoachSystemPrompt(null, many);
    const matches = s.match(/entry_date/g) ?? [];
    expect(matches.length).toBe(14);
  });
});

describe("averageDailyFootprint", () => {
  it("returns 0 for empty", () => {
    expect(averageDailyFootprint([])).toBe(0);
  });
  it("averages totals", () => {
    expect(averageDailyFootprint([entry({ total_kg: 10 }), entry({ total_kg: 20 })])).toBe(15);
  });
  it("rounds to 2 decimals", () => {
    expect(averageDailyFootprint([entry({ total_kg: 1 }), entry({ total_kg: 2 }), entry({ total_kg: 2 })])).toBeCloseTo(1.67, 2);
  });
});

describe("topCategory", () => {
  it("identifies transportation as top", () => {
    expect(topCategory(entry({ transportation_kg: 10, electricity_kg: 1 }))).toBe("transportation_kg");
  });
  it("identifies food as top", () => {
    expect(topCategory(entry({ transportation_kg: 0, food_kg: 8, electricity_kg: 1 }))).toBe("food_kg");
  });
  it("breaks ties consistently with first category", () => {
    const e = entry({ transportation_kg: 5, electricity_kg: 5, food_kg: 5, shopping_kg: 5, waste_kg: 5 });
    expect(topCategory(e)).toBe("transportation_kg");
  });
});
