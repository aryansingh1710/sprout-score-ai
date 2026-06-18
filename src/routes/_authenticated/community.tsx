import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { awardParticipationBadge } from "@/lib/gamification.functions";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "Community — Verdant" }] }),
  component: Community,
});

function Community() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const awardBadge = useServerFn(awardParticipationBadge);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const postsQ = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, content, kind, created_at, image_url")
        .order("created_at", { ascending: false })
        .limit(50);
      const ids = Array.from(new Set((data ?? []).map((p) => p.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, display_name").in("id", ids)
        : { data: [] as any[] };
      const { data: likes } = await supabase.from("post_likes").select("post_id, user_id");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const likeMap = new Map<string, string[]>();
      (likes ?? []).forEach((l: any) => {
        const arr = likeMap.get(l.post_id) ?? [];
        arr.push(l.user_id);
        likeMap.set(l.post_id, arr);
      });
      return (data ?? []).map((p) => ({
        ...p,
        author: profileMap.get(p.user_id),
        likes: likeMap.get(p.id) ?? [],
      }));
    },
  });

  const createPost = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("posts").insert({ user_id: userId!, content: text });
      if (error) throw error;
    },
    onSuccess: async () => {
      setContent("");
      // award badge
      const { data: badge } = await supabase.from("badges").select("id").eq("slug", "community-voice").maybeSingle();
      if (badge) await supabase.from("user_badges").upsert({ user_id: userId!, badge_id: badge.id }, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Posted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId!);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: userId! });
      }
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const prev = qc.getQueryData(["posts"]) as any[] | undefined;
      qc.setQueryData(["posts"], (prev ?? []).map((p: any) =>
        p.id === postId
          ? { ...p, likes: liked ? p.likes.filter((u: string) => u !== userId) : [...p.likes, userId] }
          : p,
      ));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["posts"], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("posts").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold">Community</h1>
        <p className="text-sm text-muted-foreground">Share wins, swap tips, cheer each other on.</p>
      </div>

      <GlassCard>
        <form
          onSubmit={(e) => { e.preventDefault(); if (content.trim()) createPost.mutate(content.trim()); }}
          className="space-y-3"
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you do today for the planet?"
            maxLength={500}
            required
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{content.length}/500</span>
            <Button type="submit" disabled={createPost.isPending || !content.trim()} className="gap-2">
              <Send className="size-4" /> Post
            </Button>
          </div>
        </form>
      </GlassCard>

      <div className="space-y-3">
        {postsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {postsQ.data?.length === 0 && (
          <GlassCard className="text-center text-sm text-muted-foreground">
            Be the first to post.
          </GlassCard>
        )}
        {postsQ.data?.map((p) => {
          const liked = userId ? p.likes.includes(userId) : false;
          const initials = (p.author?.display_name ?? "?").slice(0, 2).toUpperCase();
          return (
            <GlassCard key={p.id}>
              <div className="flex gap-3">
                <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.author?.display_name ?? "Someone"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {p.user_id === userId && (
                      <Button variant="ghost" size="icon" onClick={() => deletePost.mutate(p.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{p.content}</p>
                  <button
                    onClick={() => toggleLike.mutate({ postId: p.id, liked })}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition"
                  >
                    <Heart className={`size-4 ${liked ? "fill-accent text-accent" : ""}`} />
                    {p.likes.length}
                  </button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
