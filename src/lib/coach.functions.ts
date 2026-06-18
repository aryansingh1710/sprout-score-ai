import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const askSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export const askCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => askSchema.parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const { supabase, userId } = context;

    // Fetch last 14 days of footprint to ground the response
    const { data: entries } = await supabase
      .from("footprint_entries")
      .select(
        "entry_date, total_kg, transportation_kg, electricity_kg, food_kg, shopping_kg, waste_kg",
      )
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .limit(14);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, weekly_goal_kg, streak_days")
      .eq("id", userId)
      .maybeSingle();

    // Persist user message
    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "user",
      content: data.message,
    });

    const { data: history } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    const system = `You are an upbeat, practical sustainability coach for the Carbon Footprint Awareness Platform.
- Be concise (under 180 words). Use short paragraphs and at most 4 bullet points.
- Ground advice in the user's recent data when relevant.
- Always provide concrete, doable next steps.
- When recommending an action, give a rough estimated CO2 reduction (kg/week) and money savings (USD/week) in parentheses.
- Tone: warm, motivating, no judgment.

User profile: ${JSON.stringify(profile ?? {})}
Recent 14-day footprint entries: ${JSON.stringify(entries ?? [])}`;

    const provider = createLovableAiGatewayProvider(key);
    let text = "";
    try {
      const result = await generateText({
        model: provider("google/gemini-3-flash-preview"),
        system,
        messages: (history ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });
      text = result.text;
    } catch (e: unknown) {
      const msg = errorMessage(e, "AI request failed");
      if (msg.includes("429")) throw new Error("AI is rate-limited. Try again shortly.");
      if (msg.includes("402"))
        throw new Error("AI credits exhausted. Please add credits in workspace billing.");
      throw new Error("AI coach failed: " + msg);
    }

    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "assistant",
      content: text,
    });

    return { reply: text };
  });

export const clearCoachHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("coach_messages").delete().eq("user_id", context.userId);
    return { ok: true };
  });
