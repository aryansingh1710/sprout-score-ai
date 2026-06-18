import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard } from "@/components/glass-card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Verdant" },
      { name: "description", content: "Sign in or create your Verdant account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleEmail(
    mode: "signin" | "signup",
    email: string,
    password: string,
    name?: string,
  ) {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: name ? { full_name: name } : undefined,
          },
        });
        if (error) throw error;
        toast.success("Account created. You're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      router.invalidate();
      navigate({ to: "/dashboard", replace: true });
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-10 rounded-xl bg-gradient-to-br from-teal to-accent grid place-items-center">
            <Leaf className="size-5 text-teal-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">Verdant</span>
        </div>
        <GlassCard className="p-8">
          <h1 className="text-2xl font-display font-semibold text-center">Welcome</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Sign in to start lowering your footprint.
          </p>

          <Button
            onClick={handleGoogle}
            disabled={loading}
            variant="outline"
            className="w-full mt-6 gap-2"
          >
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <EmailForm
                loading={loading}
                onSubmit={(e, p) => handleEmail("signin", e, p)}
                cta="Sign in"
              />
            </TabsContent>
            <TabsContent value="signup">
              <EmailForm
                loading={loading}
                onSubmit={(e, p, n) => handleEmail("signup", e, p, n)}
                cta="Create account"
                showName
              />
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
}

function EmailForm({
  loading,
  onSubmit,
  cta,
  showName,
}: {
  loading: boolean;
  onSubmit: (email: string, password: string, name?: string) => void;
  cta: string;
  showName?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(email, password, name);
      }}
      className="space-y-3 mt-4"
    >
      {showName && (
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait…" : cta}
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
