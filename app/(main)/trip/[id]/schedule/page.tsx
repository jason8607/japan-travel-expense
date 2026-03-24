"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, MapPin } from "lucide-react";
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
  const [loaded, setLoaded] = useState(false);

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

      if (s && s.length > 0) {
        setSchedule(s);
      } else if (t) {
        const days = eachDayOfInterval({
          start: parseISO(t.start_date),
          end: parseISO(t.end_date),
        });
        setSchedule(
          days.map((d) => ({
            id: crypto.randomUUID(),
            trip_id: tripId,
            date: format(d, "yyyy-MM-dd"),
            location: "",
            region: "",
          }))
        );
      }
      setLoaded(true);
    };
    load();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        載入中...
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="旅程日程" showBack />

      <div className="p-4 space-y-4">
        {/* 說明卡片 */}
        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">設定每天的旅行地點</p>
              <p className="text-xs text-orange-600 mt-1">
                填寫後，新增消費時會自動帶入當天地點，方便記錄在哪裡花的錢。
              </p>
            </div>
          </div>
        </div>

        {/* 日程列表 */}
        <div className="space-y-2">
          {schedule.map((item, index) => {
            const date = parseISO(item.date);
            const dayOfWeek = dayLabels[date.getDay()];

            return (
              <div
                key={item.id || index}
                className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 shadow-sm"
              >
                <div className="shrink-0 w-14 text-center">
                  <p className="text-sm font-semibold text-slate-700">
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
                  placeholder="地點，例：東京、金澤"
                  className="flex-1 h-9 text-sm rounded-lg border-slate-200 focus-visible:ring-orange-500"
                />
                <button
                  onClick={() => removeScheduleItem(index)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {schedule.length > 0 && (
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-xl text-base font-semibold shadow-lg shadow-orange-200"
            disabled={saving}
          >
            {saving ? "儲存中..." : "儲存日程"}
          </Button>
        )}
      </div>
    </div>
  );
}
