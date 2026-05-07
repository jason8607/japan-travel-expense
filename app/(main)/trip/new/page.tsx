"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewTripPage() {
  const { user, setCurrentTrip, refreshTrips } = useApp();
  const router = useRouter();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (endDate < startDate) {
      toast.error("結束日期不可早於開始日期");
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          start_date: startDate,
          end_date: endDate,
          budget_jpy: budget ? Number(budget) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "建立失敗");

      await refreshTrips();
      setCurrentTrip(data.trip);
      toast.success("旅程已建立！");
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "建立失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="name">旅程名稱</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：2026 日本北陸之旅"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start">開始日期</Label>
            <DateInput
              id="start"
              value={startDate}
              onChange={setStartDate}
              required
              ariaLabel="開始日期"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">結束日期</Label>
            <DateInput
              id="end"
              value={endDate}
              onChange={setEndDate}
              required
              ariaLabel="結束日期"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">旅程預算 (¥)</Label>
          <Input
            id="budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="選填，例：100000"
          />
          <p className="text-xs text-muted-foreground">
            設定後可在首頁查看預算進度與每日建議額度
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base bg-primary hover:bg-primary/90"
          disabled={saving}
        >
          {saving ? "建立中..." : "建立旅程"}
        </Button>
      </form>
    </div>
  );
}
