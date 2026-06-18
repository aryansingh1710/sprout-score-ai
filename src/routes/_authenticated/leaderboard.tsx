import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { Trophy, Medal, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Verdant" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const q = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, total_score, streak_days")
        .order("total_score", { ascending: false })
        .order("streak_days", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Trophy className="size-7 text-accent" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">Top carbon scores across the community.</p>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <ul className="divide-y divide-border/40">
          {q.data?.map((u, i) => (
            <li key={u.id} className="flex items-center gap-4 p-4">
              <div className="w-8 text-center font-display font-bold text-lg">
                {i === 0 ? <Medal className="size-5 text-accent mx-auto" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.display_name ?? "Anonymous"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Flame className="size-3 text-accent" /> {u.streak_days} day streak
                </p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold gradient-text">{u.total_score ?? 0}</div>
                <p className="text-xs text-muted-foreground">score</p>
              </div>
            </li>
          ))}
          {q.data?.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">No scores yet.</li>
          )}
        </ul>
      </GlassCard>
    </div>
  );
}
