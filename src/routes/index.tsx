import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, Sparkles, BarChart3, Trophy, Bot, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verdant — Track and reduce your carbon footprint" },
      {
        name: "description",
        content:
          "Verdant helps you measure, understand, and lower your carbon emissions with personalized AI coaching, challenges, and a community of doers.",
      },
      { property: "og:title", content: "Verdant — Carbon Footprint Awareness Platform" },
      {
        property: "og:description",
        content: "Measure, understand, and lower your COâ‚‚ — with an AI sustainability coach by your side.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-teal to-accent grid place-items-center">
            <Leaf className="size-5 text-teal-foreground" />
          </div>
          <span className="font-display font-bold text-lg">Verdant</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="size-3.5 text-accent" />
          AI sustainability coach included
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Lower your <span className="gradient-text">carbon footprint</span>,
          <br /> one honest day at a time.
        </h1>
        <p className="max-w-2xl mx-auto mt-6 text-lg text-muted-foreground">
          Verdant turns daily habits into a clear COâ‚‚ score, then coaches you with practical, money-saving swaps —
          backed by streaks, challenges and a community that cheers you on.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">Start tracking free <ArrowRight className="size-4" /></Button>
          </Link>
          <a href="#features"><Button size="lg" variant="ghost">See how it works</Button></a>
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <GlassCard className="text-left">
            <div className="text-3xl font-display font-bold gradient-text">0–100</div>
            <p className="text-sm text-muted-foreground mt-1">Daily carbon score with category breakdown</p>
          </GlassCard>
          <GlassCard className="text-left">
            <div className="text-3xl font-display font-bold gradient-text">~14kg</div>
            <p className="text-sm text-muted-foreground mt-1">Avg weekly COâ‚‚e saved by users following the coach</p>
          </GlassCard>
          <GlassCard className="text-left">
            <div className="text-3xl font-display font-bold gradient-text">5min</div>
            <p className="text-sm text-muted-foreground mt-1">All it takes to log a day. Streaks do the rest.</p>
          </GlassCard>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: BarChart3, title: "Honest measurement", desc: "Transportation, electricity, food, shopping and waste — translated into kg COâ‚‚e you can act on." },
          { icon: Bot, title: "AI sustainability coach", desc: "Grounded in your real data. Suggests concrete swaps with estimated COâ‚‚ and money saved." },
          { icon: Trophy, title: "Streaks, badges, community", desc: "Weekly challenges, leaderboard and a feed to share wins. Sustainable change is social." },
        ].map((f) => (
          <GlassCard key={f.title}>
            <f.icon className="size-6 text-accent mb-3" />
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
          </GlassCard>
        ))}
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        Built with care. Powered by Lovable Cloud + AI.
      </footer>
    </div>
  );
}
