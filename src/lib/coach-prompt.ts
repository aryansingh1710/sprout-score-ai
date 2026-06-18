/**
 * Pure helpers for the AI coach. Extracted so they can be tested without
 * touching the server runtime or AI Gateway.
 */

export interface CoachContextProfile {
  display_name?: string | null;
  weekly_goal_kg?: number | null;
  streak_days?: number | null;
}

export interface CoachContextEntry {
  entry_date: string;
  total_kg: number;
  transportation_kg: number;
  electricity_kg: number;
  food_kg: number;
  shopping_kg: number;
  waste_kg: number;
}

/** Sanitize a user message before sending to the model. */
export function sanitizeCoachMessage(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, 1000);
}

/** Build the grounded system prompt for the coach. */
export function buildCoachSystemPrompt(
  profile: CoachContextProfile | null,
  entries: CoachContextEntry[],
): string {
  const safeProfile = profile ?? {};
  const safeEntries = Array.isArray(entries) ? entries.slice(0, 14) : [];
  return [
    "You are an upbeat, practical sustainability coach for the Carbon Footprint Awareness Platform.",
    "- Be concise (under 180 words). Use short paragraphs and at most 4 bullet points.",
    "- Ground advice in the user's recent data when relevant.",
    "- Always provide concrete, doable next steps.",
    "- When recommending an action, give a rough estimated CO2 reduction (kg/week) and money savings (USD/week) in parentheses.",
    "- Tone: warm, motivating, no judgment.",
    "",
    `User profile: ${JSON.stringify(safeProfile)}`,
    `Recent 14-day footprint entries: ${JSON.stringify(safeEntries)}`,
  ].join("\n");
}

/** Compute average daily footprint over recent entries. */
export function averageDailyFootprint(entries: CoachContextEntry[]): number {
  if (!entries.length) return 0;
  const sum = entries.reduce((acc, e) => acc + (e.total_kg || 0), 0);
  return Math.round((sum / entries.length) * 100) / 100;
}

/** Identify the largest emissions category from a day's entry. */
export function topCategory(entry: CoachContextEntry): keyof CoachContextEntry {
  const cats = ["transportation_kg", "electricity_kg", "food_kg", "shopping_kg", "waste_kg"] as const;
  let best: (typeof cats)[number] = cats[0];
  for (const c of cats) if ((entry[c] || 0) > (entry[best] || 0)) best = c;
  return best;
}
