import { z } from "zod";

/**
 * Simple, transparent emission factors (kg COâ‚‚e per unit).
 * Sources roughly aligned with EPA / DEFRA averages — meant as a coaching tool, not an audit.
 */
export const FACTORS = {
  // Transportation (per km)
  carKm: 0.21,
  busKm: 0.08,
  trainKm: 0.04,
  flightKm: 0.25, // averaged short/medium haul
  // Electricity (per kWh)
  electricityKwh: 0.42,
  // Food (per "serving"/day proxy)
  beefServings: 6.5,
  dairyServings: 1.4,
  veggieServings: 0.4,
  // Shopping (USD spent on goods, very rough)
  shoppingUsd: 0.35,
  // Waste (per kg landfill)
  wasteKg: 1.9,
} as const;

export const calculatorSchema = z.object({
  carKm: z.coerce.number().min(0).max(2000).default(0),
  busKm: z.coerce.number().min(0).max(2000).default(0),
  trainKm: z.coerce.number().min(0).max(2000).default(0),
  flightKm: z.coerce.number().min(0).max(20000).default(0),
  electricityKwh: z.coerce.number().min(0).max(500).default(0),
  beefServings: z.coerce.number().min(0).max(20).default(0),
  dairyServings: z.coerce.number().min(0).max(20).default(0),
  veggieServings: z.coerce.number().min(0).max(20).default(0),
  shoppingUsd: z.coerce.number().min(0).max(10000).default(0),
  wasteKg: z.coerce.number().min(0).max(200).default(0),
  notes: z.string().max(500).optional(),
});

export type CalculatorInput = z.infer<typeof calculatorSchema>;

export interface FootprintBreakdown {
  transportation_kg: number;
  electricity_kg: number;
  food_kg: number;
  shopping_kg: number;
  waste_kg: number;
  total_kg: number;
}

export function computeFootprint(i: CalculatorInput): FootprintBreakdown {
  const r = (n: number) => Math.round(n * 100) / 100;
  const transportation_kg = r(
    i.carKm * FACTORS.carKm +
      i.busKm * FACTORS.busKm +
      i.trainKm * FACTORS.trainKm +
      i.flightKm * FACTORS.flightKm,
  );
  const electricity_kg = r(i.electricityKwh * FACTORS.electricityKwh);
  const food_kg = r(
    i.beefServings * FACTORS.beefServings +
      i.dairyServings * FACTORS.dairyServings +
      i.veggieServings * FACTORS.veggieServings,
  );
  const shopping_kg = r(i.shoppingUsd * FACTORS.shoppingUsd);
  const waste_kg = r(i.wasteKg * FACTORS.wasteKg);
  const total_kg = r(transportation_kg + electricity_kg + food_kg + shopping_kg + waste_kg);
  return { transportation_kg, electricity_kg, food_kg, shopping_kg, waste_kg, total_kg };
}

/** 0–100 score. Daily benchmark: ~16 kg COâ‚‚e for global average; <5 kg is excellent. */
export function carbonScore(totalKg: number): number {
  if (totalKg <= 0) return 100;
  const score = 100 - (totalKg / 25) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const CATEGORY_LABELS = {
  transportation_kg: "Transportation",
  electricity_kg: "Electricity",
  food_kg: "Food",
  shopping_kg: "Shopping",
  waste_kg: "Waste",
} as const;
