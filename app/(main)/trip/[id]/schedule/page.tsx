"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import type { Trip, TripSchedule } from "@/types";

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [schedule, setSchedule] = useState<TripSchedule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();
      if (t) setTrip(t);

      const { data: s } = await supabase
        .from("trip_schedule")
        .select("*")
        .eq("trip_id", tripId)
        .order("date");
      if (s) setSchedule(s);
    };
    load();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateDays = () => {
    if (!trip) return;
    const days = eachDayOfInterval({
      start: parseISO(trip.start_date),
      end: parseISO(trip.end_date),
    });
    const existing = new Set(schedule.map((s) => s.date));
    const newSchedule = days
      .filter((d) => !existing.has(format(d, "yyyy-MM-dd")))
      .map((d) => ({
        id: crypto.randomUUID(),
        trip_id: tripId,
        date: format(d, "yyyy-MM-dd"),
        location: "",
        region: "",
      }));
    setSchedule([...schedule, ...newSchedule].sort((a, b) =>
      a.date.localeCompare(b.date)
    ));
  };

  const updateScheduleItem = (
    index: number,
    field: "location" | "region",
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeScheduleItem = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("trip_schedule").delete().eq("trip_id", tripId);

      const items = schedule
        .filter((s) => s.location)
        .map((s) => ({
          trip_id: tripId,
          date: s.date,
          location: s.location,
          region: s.region || s.location,
        }));

      if (items.length > 0) {
        const { error } = await supabase.from("trip_schedule").insert(items);
        if (error) throw error;
      }

      toast.success("日程已儲存");
      router.push("/settings");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div>
      <PageHeader title="旅程日程" subtitle="設定每天的行程地點" showBack />

      <div className="p-4 space-y-3">
        {trip && schedule.length === 0 && (
          <Button
            onClick={generateDays}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            自動產生每日行程
          </Button>
        )}

        {schedule.map((item, index) => {
          const date = parseISO(item.date);
          const dayOfWeek = dayLabels[date.getDay()];

          return (
            <div
              key={item.id || index}
              className="flex items-center gap-2 p-3 rounded-xl bg-gray-50"
            >
              <div className="flex-shrink-0 w-16 text-center">
                <p className="text-xs text-muted-foreground">
                  {format(date, "M/d")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ({dayOfWeek})
                </p>
              </div>
              <Input
                value={item.location}
                onChange={(e) =>
                  updateScheduleItem(index, "location", e.target.value)
                }
                placeholder="地點，例：東京"
                className="flex-1 h-8 text-sm"
              />
              <button
                onClick={() => removeScheduleItem(index)}
                className="p-1 text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {schedule.length > 0 && (
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600"
            disabled={saving}
          >
            {saving ? "儲存中..." : "儲存日程"}
          </Button>
        )}
      </div>
    </div>
  );
}
