import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Flame, TrendingDown, Target, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, carbonScore } from "@/lib/footprint";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Verdant" }] }),
  component: Dashboard,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profileQ.data && !profileQ.data.onboarded) navigate({ to: "/onboarding" });
  }, [profileQ.data, navigate]);

  const entriesQ = useQuery({
    queryKey: ["entries", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("footprint_entries")
        .select("*")
        .eq("user_id", userId!)
        .order("entry_date", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

  if (!userId || profileQ.isLoading || entriesQ.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const entries = entriesQ.data ?? [];
  const last = entries[0];
  const total7 = entries.slice(0, 7).reduce((s, e) => s + Number(e.total_kg), 0);
  const total30 = entries.slice(0, 30).reduce((s, e) => s + Number(e.total_kg), 0);
  const score = last ? carbonScore(Number(last.total_kg)) : 100;

  const trend = [...entries]
    .reverse()
    .slice(-14)
    .map((e) => ({
      date: e.entry_date.slice(5),
      kg: Number(e.total_kg),
    }));

  const breakdown = last
    ? [
        { name: CATEGORY_LABELS.transportation_kg, value: Number(last.transportation_kg) },
        { name: CATEGORY_LABELS.electricity_kg, value: Number(last.electricity_kg) },
        { name: CATEGORY_LABELS.food_kg, value: Number(last.food_kg) },
        { name: CATEGORY_LABELS.shopping_kg, value: Number(last.shopping_kg) },
        { name: CATEGORY_LABELS.waste_kg, value: Number(last.waste_kg) },
      ].filter((d) => d.value > 0)
    : [];

  const goal = Number(profileQ.data?.weekly_goal_kg ?? 100);
  const goalPct = Math.min(100, Math.round((total7 / goal) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Hello{profileQ.data?.display_name ? `, ${profileQ.data.display_name}` : ""}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Your footprint at a glance
          </h1>
        </div>
        <Link to="/calculator">
          <Button className="gap-2">
            Log today <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Carbon score</p>
            <Sparkles className="size-4 text-accent" />
          </div>
          <div className="text-4xl font-display font-bold gradient-text mt-2">{score}</div>
          <p className="text-xs text-muted-foreground mt-1">0 = high impact · 100 = featherlight</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Today</p>
            <TrendingDown className="size-4 text-primary" />
          </div>
          <div className="text-4xl font-display font-bold mt-2">
            {last ? Number(last.total_kg).toFixed(1) : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">kg COâ‚‚e</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">7-day total</p>
            <Target className="size-4 text-primary" />
          </div>
          <div className="text-4xl font-display font-bold mt-2">{total7.toFixed(1)}</div>
          <Progress value={goalPct} className="mt-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {goalPct}% of {goal} kg weekly goal
          </p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Streak</p>
            <Flame className="size-4 text-accent" />
          </div>
          <div className="text-4xl font-display font-bold mt-2">
            {profileQ.data?.streak_days ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">days logged in a row</p>
        </GlassCard>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-4">14-day trend</h2>
          {trend.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="kg"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "var(--chart-3)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="font-display text-lg font-semibold mb-4">Today's breakdown</h2>
          {breakdown.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg font-semibold">30-day total</h2>
          <span className="text-2xl font-display font-bold">{total30.toFixed(1)} kg</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Monthly view based on your last 30 logs. The lower, the better.
        </p>
      </GlassCard>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-64 grid place-items-center text-center">
      <div>
        <p className="text-sm text-muted-foreground">No data yet.</p>
        <Link to="/calculator">
          <Button variant="link" className="mt-1">
            Log your first day →
          </Button>
        </Link>
      </div>
    </div>
  );
}
