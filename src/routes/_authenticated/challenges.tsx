import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { awardParticipationBadge, completeChallenge } from "@/lib/gamification.functions";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({ meta: [{ title: "Challenges — Verdant" }] }),
  component: Challenges,
});

function Challenges() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const awardBadge = useServerFn(awardParticipationBadge);
  const completeFn = useServerFn(completeChallenge);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const q = useQuery({
    queryKey: ["challenges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: challenges } = await supabase
        .from("challenges")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      const { data: mine } = await supabase
        .from("user_challenges")
        .select("challenge_id, completed")
        .eq("user_id", userId!);
      const map = new Map((mine ?? []).map((m: any) => [m.challenge_id, m]));
      return (challenges ?? []).map((c: any) => ({ ...c, joined: map.get(c.id) }));
    },
  });

  const join = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from("user_challenges")
        .insert({ user_id: userId!, challenge_id: challengeId });
      if (error) throw error;
      await awardBadge({ data: { slug: "challenger" } }).catch(() => {});
    },
    onSuccess: () => {
      toast.success("Challenge joined!");
      qc.invalidateQueries({ queryKey: ["challenges", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (challengeId: string) => {
      await completeFn({ data: { challenge_id: challengeId } });
    },
    onSuccess: () => {
      toast.success("Marked complete! 🌱");
      qc.invalidateQueries({ queryKey: ["challenges", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Target className="size-7 text-accent" /> Eco challenges
        </h1>
        <p className="text-sm text-muted-foreground">Pick one. Move the needle this week.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {q.data?.map((c: any) => (
          <GlassCard key={c.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-lg">{c.title}</h3>
                {c.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                    {c.category}
                  </span>
                )}
              </div>
              {c.target_kg && (
                <div className="text-right">
                  <div className="font-display text-xl font-bold gradient-text">{c.target_kg}</div>
                  <p className="text-xs text-muted-foreground">kg COâ‚‚e saved</p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">{c.description}</p>
            <div className="mt-4">
              {!c.joined ? (
                <Button onClick={() => join.mutate(c.id)} disabled={join.isPending}>
                  Join challenge
                </Button>
              ) : c.joined.completed ? (
                <span className="inline-flex items-center gap-2 text-sm text-accent">
                  <CheckCircle2 className="size-4" /> Completed
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => complete.mutate(c.id)}
                  disabled={complete.isPending}
                >
                  Mark complete
                </Button>
              )}
            </div>
          </GlassCard>
        ))}
        {q.data?.length === 0 && (
          <GlassCard className="text-center text-sm text-muted-foreground">
            No active challenges right now.
          </GlassCard>
        )}
      </div>
    </div>
  );
}
