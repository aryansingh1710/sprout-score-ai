import { describe, it, expect } from "vitest";
import {
  FACTORS,
  calculatorSchema,
  computeFootprint,
  carbonScore,
  CATEGORY_LABELS,
} from "./footprint";

const base = calculatorSchema.parse({});

describe("real-world scenarios", () => {
  it("typical commuter day", () => {
    const r = computeFootprint({
      ...base,
      carKm: 30,
      electricityKwh: 8,
      beefServings: 0,
      dairyServings: 1,
      veggieServings: 2,
      shoppingUsd: 10,
      wasteKg: 1,
    });
    expect(r.transportation_kg).toBeGreaterThan(0);
    expect(r.total_kg).toBeGreaterThan(r.transportation_kg);
    expect(r.total_kg).toBeLessThan(100);
  });

  it("zero-impact day yields perfect score", () => {
    const r = computeFootprint(base);
    expect(carbonScore(r.total_kg)).toBe(100);
  });

  it("transit-only day beats car-only day", () => {
    const car = computeFootprint({ ...base, carKm: 50 });
    const train = computeFootprint({ ...base, trainKm: 50 });
    const bus = computeFootprint({ ...base, busKm: 50 });
    expect(train.total_kg).toBeLessThan(car.total_kg);
    expect(bus.total_kg).toBeLessThan(car.total_kg);
  });

  it("plant-forward diet beats beef-heavy diet", () => {
    const meat = computeFootprint({ ...base, beefServings: 3 });
    const plant = computeFootprint({ ...base, veggieServings: 3 });
    expect(plant.food_kg).toBeLessThan(meat.food_kg);
  });

  it("long-haul flight dominates the day", () => {
    const r = computeFootprint({ ...base, flightKm: 2000, carKm: 20 });
    expect(r.transportation_kg).toBeGreaterThan(400);
  });
});

describe("FACTORS sanity", () => {
  it("orders transport intensities car > bus > train", () => {
    expect(FACTORS.carKm).toBeGreaterThan(FACTORS.busKm);
    expect(FACTORS.busKm).toBeGreaterThan(FACTORS.trainKm);
  });
  it("orders food intensities beef > dairy > veggie", () => {
    expect(FACTORS.beefServings).toBeGreaterThan(FACTORS.dairyServings);
    expect(FACTORS.dairyServings).toBeGreaterThan(FACTORS.veggieServings);
  });
  it("all factors are positive", () => {
    for (const v of Object.values(FACTORS)) expect(v).toBeGreaterThan(0);
  });
});

describe("schema validation edge cases", () => {
  it("rejects non-numeric strings", () => {
    expect(() => calculatorSchema.parse({ carKm: "abc" })).toThrow();
  });
  it("accepts integer-shaped strings", () => {
    const p = calculatorSchema.parse({ carKm: "12.5" });
    expect(p.carKm).toBe(12.5);
  });
  it("accepts notes within limit", () => {
    const p = calculatorSchema.parse({ notes: "great day" });
    expect(p.notes).toBe("great day");
  });
  it("accepts boundary maxes", () => {
    const p = calculatorSchema.parse({ carKm: 2000, flightKm: 20000, electricityKwh: 500 });
    expect(p.carKm).toBe(2000);
    expect(p.flightKm).toBe(20000);
    expect(p.electricityKwh).toBe(500);
  });
});

describe("carbonScore boundaries", () => {
  it("exact 25kg is 0", () => {
    expect(carbonScore(25)).toBe(0);
  });
  it("score decreases linearly between 0 and 25", () => {
    expect(carbonScore(12.5)).toBe(50);
  });
  it("returns integer values", () => {
    for (const v of [0.1, 1.7, 3.33, 9.99, 17.5]) {
      expect(Number.isInteger(carbonScore(v))).toBe(true);
    }
  });
});

describe("CATEGORY_LABELS", () => {
  it("has human-readable strings", () => {
    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });
  it("has exactly 5 categories", () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(5);
  });
});
