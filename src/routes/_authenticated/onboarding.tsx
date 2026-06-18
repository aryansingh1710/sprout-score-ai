import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { completeOnboarding } from "@/lib/footprint.functions";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Verdant" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const onboard = useServerFn(completeOnboarding);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, onboarded")
        .eq("id", data.user.id)
        .maybeSingle();
      if (p?.onboarded) navigate({ to: "/dashboard" });
      if (p?.display_name) setName(p.display_name);
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onboard({ data: { display_name: name, weekly_goal_kg: goal } });
      toast.success("All set!");
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="flex items-center justify-center gap-2 mb-6">
        <Leaf className="size-6 text-accent" />
        <h1 className="font-display text-3xl font-bold">Welcome to Verdant</h1>
      </div>
      <GlassCard>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="name">What should we call you?</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
            />
          </div>
          <div>
            <Label htmlFor="goal">Weekly COâ‚‚e goal (kg)</Label>
            <Input
              id="goal"
              type="number"
              min={20}
              max={500}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Global average ≈ 110 kg/week. Start where you are — you'll lower it.
            </p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Start tracking"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
