import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calculator,
  Bot,
  Users,
  Trophy,
  Award,
  Target,
  Shield,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Leaf,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/coach", label: "AI Coach", icon: Bot },
  { to: "/challenges", label: "Challenges", icon: Target },
  { to: "/badges", label: "Badges", icon: Award },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/community", label: "Community", icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || !mounted) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (mounted) setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const items = isAdmin ? [...NAV, { to: "/admin", label: "Admin", icon: Shield } as const] : NAV;

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 glass rounded-none border-r p-4 flex flex-col gap-2 transition-transform md:translate-x-0 md:static md:rounded-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-2 py-3 mb-2"
          onClick={() => setOpen(false)}
        >
          <div className="size-9 rounded-xl bg-gradient-to-br from-teal to-accent grid place-items-center">
            <Leaf className="size-5 text-teal-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Verdant</span>
        </Link>
        <nav className="flex-1 flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 px-2 py-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 glass border-b">
          <button onClick={() => setOpen((s) => !s)} aria-label="Toggle menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="font-display font-bold">Verdant</span>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
