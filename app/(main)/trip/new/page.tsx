"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewTripPage() {
  const { user, setCurrentTrip } = useApp();
  const router = useRouter();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashBudget, setCashBudget] = useState("");
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
          cash_budget: cashBudget ? Number(cashBudget) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "建立失敗");

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
      <PageHeader title="建立新旅程" showBack />
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
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">結束日期</Label>
            <Input
              id="end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">現金預算 (¥)</Label>
          <Input
            id="budget"
            type="number"
            value={cashBudget}
            onChange={(e) => setCashBudget(e.target.value)}
            placeholder="選填，例：100000"
          />
          <p className="text-xs text-muted-foreground">
            設定後可在首頁查看現金預算進度
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600"
          disabled={saving}
        >
          {saving ? "建立中..." : "建立旅程"}
        </Button>
      </form>
    </div>
  );
}
