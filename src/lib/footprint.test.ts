import { describe, it, expect } from "vitest";
import {
  FACTORS,
  calculatorSchema,
  computeFootprint,
  carbonScore,
  CATEGORY_LABELS,
} from "./footprint";

describe("calculatorSchema", () => {
  it("coerces string inputs to numbers", () => {
    const parsed = calculatorSchema.parse({
      carKm: "10",
      busKm: "5",
      trainKm: "0",
      flightKm: "0",
      electricityKwh: "2",
      beefServings: "1",
      dairyServings: "0",
      veggieServings: "3",
      shoppingUsd: "20",
      wasteKg: "1",
    });
    expect(parsed.carKm).toBe(10);
    expect(parsed.shoppingUsd).toBe(20);
  });

  it("rejects negative values", () => {
    expect(() => calculatorSchema.parse({ carKm: -1 })).toThrow();
  });

  it("rejects values above max bounds", () => {
    expect(() => calculatorSchema.parse({ carKm: 99999 })).toThrow();
    expect(() => calculatorSchema.parse({ flightKm: 999999 })).toThrow();
  });

  it("defaults missing fields to 0", () => {
    const parsed = calculatorSchema.parse({});
    expect(parsed.carKm).toBe(0);
    expect(parsed.wasteKg).toBe(0);
  });

  it("caps notes length at 500", () => {
    expect(() =>
      calculatorSchema.parse({ notes: "x".repeat(501) }),
    ).toThrow();
  });
});

describe("computeFootprint", () => {
  const zero = calculatorSchema.parse({});

  it("returns all zeros for empty input", () => {
    const r = computeFootprint(zero);
    expect(r.total_kg).toBe(0);
    expect(r.transportation_kg).toBe(0);
    expect(r.electricity_kg).toBe(0);
    expect(r.food_kg).toBe(0);
    expect(r.shopping_kg).toBe(0);
    expect(r.waste_kg).toBe(0);
  });

  it("computes transportation across all modes", () => {
    const r = computeFootprint({ ...zero, carKm: 10, busKm: 10, trainKm: 10, flightKm: 10 });
    const expected =
      10 * FACTORS.carKm + 10 * FACTORS.busKm + 10 * FACTORS.trainKm + 10 * FACTORS.flightKm;
    expect(r.transportation_kg).toBeCloseTo(expected, 2);
  });

  it("computes electricity correctly", () => {
    const r = computeFootprint({ ...zero, electricityKwh: 10 });
    expect(r.electricity_kg).toBeCloseTo(10 * FACTORS.electricityKwh, 2);
  });

  it("computes food correctly", () => {
    const r = computeFootprint({ ...zero, beefServings: 2, dairyServings: 1, veggieServings: 3 });
    const expected = 2 * FACTORS.beefServings + 1 * FACTORS.dairyServings + 3 * FACTORS.veggieServings;
    expect(r.food_kg).toBeCloseTo(expected, 2);
  });

  it("computes shopping & waste", () => {
    const r = computeFootprint({ ...zero, shoppingUsd: 100, wasteKg: 5 });
    expect(r.shopping_kg).toBeCloseTo(100 * FACTORS.shoppingUsd, 2);
    expect(r.waste_kg).toBeCloseTo(5 * FACTORS.wasteKg, 2);
  });

  it("total equals sum of categories", () => {
    const r = computeFootprint({
      ...zero,
      carKm: 12,
      electricityKwh: 8,
      beefServings: 1,
      shoppingUsd: 30,
      wasteKg: 2,
    });
    const sum = r.transportation_kg + r.electricity_kg + r.food_kg + r.shopping_kg + r.waste_kg;
    expect(r.total_kg).toBeCloseTo(sum, 2);
  });

  it("rounds to 2 decimal places", () => {
    const r = computeFootprint({ ...zero, carKm: 1 });
    expect(Number.isFinite(r.transportation_kg)).toBe(true);
    expect(r.transportation_kg.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });
});

describe("carbonScore", () => {
  it("returns 100 for zero or negative footprint", () => {
    expect(carbonScore(0)).toBe(100);
    expect(carbonScore(-5)).toBe(100);
  });

  it("returns 0 for very high footprint", () => {
    expect(carbonScore(100)).toBe(0);
    expect(carbonScore(25)).toBe(0);
  });

  it("returns ~80 for 5 kg", () => {
    expect(carbonScore(5)).toBe(80);
  });

  it("is monotonically non-increasing as footprint grows", () => {
    const values = [0, 1, 5, 10, 15, 20, 25];
    const scores = values.map(carbonScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("stays within [0,100]", () => {
    for (const v of [0, 1, 3.3, 12.7, 24.9, 50]) {
      const s = carbonScore(v);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("CATEGORY_LABELS", () => {
  it("covers every breakdown key", () => {
    const r = computeFootprint(calculatorSchema.parse({}));
    for (const key of Object.keys(r)) {
      if (key === "total_kg") continue;
      expect(CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS]).toBeTruthy();
    }
  });
});
