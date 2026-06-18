import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { Award, Sprout, Flame, Feather, Target, Megaphone, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  sprout: Sprout,
  flame: Flame,
  feather: Feather,
  target: Target,
  megaphone: Megaphone,
  leaf: Leaf,
};

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({ meta: [{ title: "Badges — Verdant" }] }),
  component: Badges,
});

function Badges() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const q = useQuery({
    queryKey: ["badges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: all } = await supabase.from("badges").select("*").order("name");
      const { data: mine } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId!);
      const set = new Set((mine ?? []).map((m) => m.badge_id));
      return (all ?? []).map((b) => ({ ...b, earned: set.has(b.id) }));
    },
  });

  const earnedCount = q.data?.filter((b) => b.earned).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Award className="size-7 text-accent" /> Badges
        </h1>
        <p className="text-sm text-muted-foreground">
          Earned {earnedCount} / {q.data?.length ?? 0}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {q.data?.map((b) => {
          const Icon = ICONS[b.icon] ?? Leaf;
          return (
            <GlassCard
              key={b.id}
              className={cn("text-center", !b.earned && "opacity-50 grayscale")}
            >
              <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-teal to-accent grid place-items-center mb-3">
                <Icon className="size-8 text-teal-foreground" />
              </div>
              <h3 className="font-display font-semibold">{b.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
              {b.earned && <p className="text-xs text-accent mt-2">Earned ✓</p>}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
