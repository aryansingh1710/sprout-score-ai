import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Car, Bus, Train, Plane, Zap, Beef, Milk, Salad, ShoppingBag, Trash2 } from "lucide-react";
import { saveFootprintEntry } from "@/lib/footprint.functions";
import { calculatorSchema, computeFootprint, carbonScore, CATEGORY_LABELS } from "@/lib/footprint";

export const Route = createFileRoute("/_authenticated/calculator")({
  head: () => ({ meta: [{ title: "Calculator — Verdant" }] }),
  component: Calculator,
});

const FIELDS: {
  key: keyof ReturnType<typeof empty>;
  label: string;
  unit: string;
  icon: any;
  group: string;
}[] = [
  { key: "carKm", label: "Car", unit: "km", icon: Car, group: "Transportation" },
  { key: "busKm", label: "Bus", unit: "km", icon: Bus, group: "Transportation" },
  { key: "trainKm", label: "Train", unit: "km", icon: Train, group: "Transportation" },
  { key: "flightKm", label: "Flight", unit: "km", icon: Plane, group: "Transportation" },
  { key: "electricityKwh", label: "Electricity", unit: "kWh", icon: Zap, group: "Electricity" },
  { key: "beefServings", label: "Beef / lamb", unit: "servings", icon: Beef, group: "Food" },
  { key: "dairyServings", label: "Dairy", unit: "servings", icon: Milk, group: "Food" },
  { key: "veggieServings", label: "Plant-based", unit: "servings", icon: Salad, group: "Food" },
  { key: "shoppingUsd", label: "Shopping", unit: "USD", icon: ShoppingBag, group: "Shopping" },
  { key: "wasteKg", label: "Waste to landfill", unit: "kg", icon: Trash2, group: "Waste" },
];

function empty() {
  return {
    carKm: 0,
    busKm: 0,
    trainKm: 0,
    flightKm: 0,
    electricityKwh: 0,
    beefServings: 0,
    dairyServings: 0,
    veggieServings: 0,
    shoppingUsd: 0,
    wasteKg: 0,
    notes: "",
  };
}

function Calculator() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(saveFootprintEntry);
  const [values, setValues] = useState(empty());
  const [loading, setLoading] = useState(false);

  const live = (() => {
    try {
      return computeFootprint(calculatorSchema.parse(values));
    } catch {
      return computeFootprint(calculatorSchema.parse(empty()));
    }
  })();
  const score = carbonScore(live.total_kg);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = calculatorSchema.parse(values);
      await save({ data: parsed });
      toast.success(`Logged ${live.total_kg.toFixed(1)} kg COâ‚‚e for today`);
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Could not save"));
    } finally {
      setLoading(false);
    }
  }

  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Daily calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimate today's COâ‚‚e. Fields are rough — consistency beats precision.
        </p>
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {groups.map((g) => (
            <GlassCard key={g}>
              <h3 className="font-display font-semibold mb-3">{g}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {FIELDS.filter((f) => f.group === g).map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={f.key} className="flex items-center gap-2 text-xs">
                      <f.icon className="size-3.5" /> {f.label}{" "}
                      <span className="text-muted-foreground">({f.unit})</span>
                    </Label>
                    <Input
                      id={f.key}
                      type="number"
                      min={0}
                      step="0.1"
                      value={(values as any)[f.key]}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [f.key]: e.target.value === "" ? 0 : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
          <GlassCard>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={values.notes}
              maxLength={500}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
              placeholder="Any context for the coach?"
            />
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="sticky top-4">
            <p className="text-sm text-muted-foreground">Estimated total</p>
            <div className="text-5xl font-display font-bold gradient-text mt-1">
              {live.total_kg.toFixed(1)}
              <span className="text-base text-muted-foreground font-normal"> kg COâ‚‚e</span>
            </div>
            <p className="text-sm mt-2">
              Score: <span className="font-semibold">{score}</span> / 100
            </p>

            <div className="mt-4 space-y-2 text-sm">
              {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{CATEGORY_LABELS[k]}</span>
                  <span className="font-medium">{(live as any)[k].toFixed(1)} kg</span>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-6">
              {loading ? "Saving…" : "Save today's entry"}
            </Button>
          </GlassCard>
        </div>
      </form>
    </div>
  );
}
