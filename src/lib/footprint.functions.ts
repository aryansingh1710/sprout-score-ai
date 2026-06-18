import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculatorSchema, computeFootprint, carbonScore } from "./footprint";

const onboardingSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  weekly_goal_kg: z.coerce.number().min(20).max(500),
});

export const saveFootprintEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => calculatorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const breakdown = computeFootprint(data);
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("footprint_entries").insert({
      user_id: userId,
      entry_date: today,
      ...breakdown,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);

    // Streak update
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_entry_date, streak_days")
      .eq("id", userId)
      .maybeSingle();
    let streak = 1;
    if (profile?.last_entry_date) {
      const last = new Date(profile.last_entry_date);
      const diff = Math.round((new Date(today).getTime() - last.getTime()) / 86400000);
      if (diff === 0) streak = profile.streak_days || 1;
      else if (diff === 1) streak = (profile.streak_days || 0) + 1;
      else streak = 1;
    }
    await supabase
      .from("profiles")
      .update({
        last_entry_date: today,
        streak_days: streak,
        total_score: carbonScore(breakdown.total_kg),
      })
      .eq("id", userId);

    // Award badges (best-effort)
    const slugs: string[] = ["first-step"];
    if (breakdown.total_kg < 5) slugs.push("low-day");
    if (streak >= 7) slugs.push("week-streak");
    if (streak >= 30) slugs.push("month-streak");
    if (slugs.length) {
      const { data: badges } = await supabase.from("badges").select("id, slug").in("slug", slugs);
      if (badges?.length) {
        // Use service-role client: the user_badges INSERT policy has been
        // removed so clients cannot grant themselves badges. Eligibility
        // is established above (entry inserted, streak computed).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("user_badges").upsert(
          badges.map((b) => ({ user_id: userId, badge_id: b.id })),
          { onConflict: "user_id,badge_id", ignoreDuplicates: true },
        );
      }
    }

    return { ...breakdown, streak, score: carbonScore(breakdown.total_kg) };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => onboardingSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, onboarded: true })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
