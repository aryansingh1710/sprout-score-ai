import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { askCoach, clearCoachHistory } from "@/lib/coach.functions";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "AI Coach — Verdant" }] }),
  component: Coach,
});

const SUGGESTIONS = [
  "Where am I losing the most COâ‚‚?",
  "Give me a 1-week challenge based on my data.",
  "Cheapest swap to cut my transport emissions?",
  "How does my week compare to a good baseline?",
];

function Coach() {
  const qc = useQueryClient();
  const ask = useServerFn(askCoach);
  const clear = useServerFn(clearCoachHistory);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const messagesQ = useQuery({
    queryKey: ["coach", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_messages")
        .select("id, role, content, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async (message: string) => ask({ data: { message } }),
    onMutate: async (message) => {
      await qc.cancelQueries({ queryKey: ["coach", userId] });
      const prev = qc.getQueryData(["coach", userId]) as any[] | undefined;
      qc.setQueryData(
        ["coach", userId],
        [
          ...(prev ?? []),
          { id: "tmp-u", role: "user", content: message, created_at: new Date().toISOString() },
          { id: "tmp-a", role: "assistant", content: "…", created_at: new Date().toISOString() },
        ],
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["coach", userId], ctx.prev);
      toast.error(e.message ?? "Coach unavailable");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["coach", userId] }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [messagesQ.data?.length, send.isPending]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || send.isPending) return;
    setInput("");
    send.mutate(t);
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Bot className="size-7 text-accent" /> Sustainability coach
          </h1>
          <p className="text-sm text-muted-foreground">Grounded in your last 14 days of data.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await clear({});
            qc.invalidateQueries({ queryKey: ["coach", userId] });
          }}
          className="gap-2"
        >
          <Trash2 className="size-4" /> Clear
        </Button>
      </div>

      <GlassCard className="flex-1 flex flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {(!messagesQ.data || messagesQ.data.length === 0) && (
            <div className="grid place-items-center h-full text-center">
              <div className="max-w-md">
                <Sparkles className="size-8 text-accent mx-auto mb-3" />
                <p className="font-display text-lg">Ask anything about your footprint.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  I see your last 14 days and your weekly goal.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="text-xs px-3 py-1.5 rounded-full glass hover:bg-primary/10 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messagesQ.data?.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "glass",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="border-t border-border/50 p-4 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach…"
            disabled={send.isPending}
          />
          <Button type="submit" disabled={send.isPending || !input.trim()} className="gap-2">
            <Send className="size-4" />
            {send.isPending ? "…" : "Send"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
