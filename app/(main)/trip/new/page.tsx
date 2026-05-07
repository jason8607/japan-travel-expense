"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { TripForm } from "@/components/trip/trip-form";
import { toast } from "sonner";

export default function NewTripPage() {
  const { user, setCurrentTrip, refreshTrips } = useApp();
  const router = useRouter();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("請先登入");
      return;
    }
    if (!name.trim()) {
      toast.error("請輸入旅程名稱");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("請選擇旅程日期");
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          budget_jpy: budget ? Number(budget) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "建立失敗");

      await refreshTrips();
      setCurrentTrip(data.trip);
      toast.success("旅程已建立");
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "建立失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TripForm
      name={name}
      startDate={startDate}
      endDate={endDate}
      budget={budget}
      saving={saving}
      submitLabel="建立旅程"
      savingLabel="建立中…"
      onChangeName={setName}
      onChangeStartDate={setStartDate}
      onChangeEndDate={setEndDate}
      onChangeBudget={setBudget}
      onSubmit={handleSubmit}
    />
  );
}
