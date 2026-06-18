import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const badgeSlugSchema = z.object({
  slug: z.enum(["challenger", "community-voice"]),
});

/**
 * Award a participation badge (challenger / community-voice) to the caller.
 * Eligibility is verified server-side before insertion so a client cannot
 * grant itself arbitrary badges.
 */
export const awardParticipationBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => badgeSlugSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify eligibility server-side
    if (data.slug === "challenger") {
      const { count } = await supabase
        .from("user_challenges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (!count || count < 1) return { ok: false, reason: "not_eligible" };
    } else if (data.slug === "community-voice") {
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (!count || count < 1) return { ok: false, reason: "not_eligible" };
    }

    const { data: badge } = await supabase
      .from("badges")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!badge) return { ok: false, reason: "badge_missing" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_badges")
      .upsert(
        { user_id: userId, badge_id: badge.id },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      );
    return { ok: true };
  });

/**
 * Mark a challenge complete for the caller. Verifies the user actually
 * joined the challenge and that the challenge is active before updating.
 * Performed with the service-role client because the RLS UPDATE policy
 * has been removed to prevent unvalidated self-completion.
 */
export const completeChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: join } = await supabase
      .from("user_challenges")
      .select("id, completed, challenge_id")
      .eq("user_id", userId)
      .eq("challenge_id", data.challenge_id)
      .maybeSingle();
    if (!join) throw new Error("You haven't joined this challenge.");
    if (join.completed) return { ok: true, already: true };

    const { data: challenge } = await supabase
      .from("challenges")
      .select("id, active")
      .eq("id", data.challenge_id)
      .maybeSingle();
    if (!challenge || !challenge.active) {
      throw new Error("Challenge is not active.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_challenges")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", join.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
