"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  tripId: string;
  initialTotal: number | null;
  initialDaily: number | null;
  onSaved?: (next: { total: number | null; daily: number | null }) => void;
}

export function PersonalBudgetForm({ tripId, initialTotal, initialDaily, onSaved }: Props) {
  const [total, setTotal] = useState<string>(initialTotal == null ? "" : String(initialTotal));
  const [daily, setDaily] = useState<string>(initialDaily == null ? "" : String(initialDaily));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        trip_id: tripId,
        total_budget_jpy: total === "" ? null : Number(total),
        daily_budget_jpy: daily === "" ? null : Number(daily),
      };
      const res = await fetch("/api/trip-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "儲存失敗");
        return;
      }
      toast.success("個人預算已更新");
      onSaved?.({ total: payload.total_budget_jpy, daily: payload.daily_budget_jpy });
    } catch {
      toast.error("儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          個人總預算 (¥) <span className="font-normal">(選填)</span>
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="例：70000"
          className="tabular-nums"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          個人每日預算 (¥) <span className="font-normal">(選填)</span>
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={daily}
          onChange={(e) => setDaily(e.target.value)}
          placeholder="例：10000"
          className="tabular-nums"
        />
        <p className="text-[11px] text-muted-foreground">
          每日預算未填時，會自動取「個人總預算 ÷ 天數」。
        </p>
      </div>

      <Button type="button" className="w-full" disabled={saving} onClick={save}>
        {saving ? "儲存中…" : "儲存個人預算"}
      </Button>
    </div>
  );
}
