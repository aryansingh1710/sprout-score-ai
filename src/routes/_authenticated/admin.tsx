import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Trash2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Verdant" }] }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    });
  }, []);

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const postsQ = useQuery({
    queryKey: ["admin-posts"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const challengesQ = useQuery({
    queryKey: ["admin-challenges"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createChallenge = useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      category: string;
      target_kg: number;
    }) => {
      const { error } = await supabase
        .from("challenges")
        .insert({ ...input, created_by: userId, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success("Challenge created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleChallenge = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("challenges").update({ active }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-challenges"] }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("posts").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("food");
  const [target, setTarget] = useState(10);

  if (isAdmin === null) return <p className="text-sm text-muted-foreground">Checking access…</p>;
  if (isAdmin === false) {
    return (
      <GlassCard className="max-w-md mx-auto text-center">
        <AlertCircle className="size-8 mx-auto text-destructive mb-2" />
        <h2 className="font-display text-xl font-semibold">Admin only</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You need the <code className="px-1 py-0.5 bg-muted rounded">admin</code> role. Grant it
          via the Cloud Database for your user in <code>user_roles</code>.
        </p>
        <Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>
          Back to dashboard
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Shield className="size-7 text-accent" /> Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage users, challenges, and community posts.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="font-display font-semibold mb-3">Create challenge</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createChallenge.mutate({
                title,
                description: desc,
                category: cat,
                target_kg: target,
              });
              setTitle("");
              setDesc("");
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="t">Title</Label>
              <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="d">Description</Label>
              <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c">Category</Label>
                <Input id="c" value={cat} onChange={(e) => setCat(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tk">Target kg COâ‚‚e</Label>
                <Input
                  id="tk"
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                />
              </div>
            </div>
            <Button type="submit" className="gap-2">
              <Plus className="size-4" /> Add
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="font-display font-semibold mb-3">
            Challenges ({challengesQ.data?.length ?? 0})
          </h2>
          <ul className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {challengesQ.data?.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.category} · {c.active ? "active" : "inactive"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleChallenge.mutate({ id: c.id, active: !c.active })}
                >
                  {c.active ? "Disable" : "Enable"}
                </Button>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h2 className="font-display font-semibold mb-3">Users ({usersQ.data?.length ?? 0})</h2>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Score</th>
                  <th>Streak</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersQ.data?.map((u) => (
                  <tr key={u.id} className="border-t border-border/40">
                    <td className="py-2">{u.display_name ?? "—"}</td>
                    <td>{u.total_score}</td>
                    <td>{u.streak_days}</td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h2 className="font-display font-semibold mb-3">Posts ({postsQ.data?.length ?? 0})</h2>
          <ul className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {postsQ.data?.map((p) => (
              <li key={p.id} className="flex items-start gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{p.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deletePost.mutate(p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
