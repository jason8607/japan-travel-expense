"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { notifyExpensesMutated } from "@/lib/expenses-mutated";
import { getGuestExpenses, getGuestTrip, clearGuestData } from "@/lib/guest-storage";
import { getExchangeRate, jpyToTwd } from "@/lib/exchange-rate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Trip, Expense } from "@/types";

export function GuestMigrationDialog() {
  const { showMigration, setShowMigration, refreshTrips, setCurrentTrip } = useApp();
  const [migrating, setMigrating] = useState(false);
  const [guestExpenses, setGuestExpenses] = useState<Expense[]>([]);
  const [guestTrip, setGuestTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (showMigration) {
      setGuestExpenses(getGuestExpenses());
      setGuestTrip(getGuestTrip());
    }
  }, [showMigration]);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const tripRes = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestTrip?.name || "我的旅程",
          start_date: guestTrip?.start_date,
          end_date: guestTrip?.end_date,
          cash_budget: guestTrip?.cash_budget,
          budget_jpy: guestTrip?.budget_jpy,
        }),
      });
      const tripData = await tripRes.json();
      if (!tripRes.ok) throw new Error(tripData.error || "建立旅程失敗");

      const newTripId = tripData.trip.id;

      let successCount = 0;
      if (guestExpenses.length > 0) {
        const rate = await getExchangeRate();
        const results = await Promise.all(
          guestExpenses.map(async (exp) => {
            const twd = exp.amount_twd || jpyToTwd(exp.amount_jpy, rate);
            const res = await fetch("/api/expenses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trip_id: newTripId,
                title: exp.title,
                amount_jpy: exp.amount_jpy,
                amount_twd: twd,
                exchange_rate: exp.exchange_rate || rate,
                category: exp.category,
                payment_method: exp.payment_method,
                store_name: exp.store_name,
                location: exp.location,
                expense_date: exp.expense_date,
                split_type: "personal",
              }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              console.error("Migration expense error:", err);
              return false;
            }
            return true;
          })
        );
        successCount = results.filter(Boolean).length;
      }

      const trips = await refreshTrips();
      const migrated = trips.find((t: { id: string }) => t.id === newTripId);
      if (migrated) setCurrentTrip(migrated);

      notifyExpensesMutated();

      const failCount = guestExpenses.length - successCount;
      if (failCount > 0) {
        toast.warning(`已匯入 ${successCount}/${guestExpenses.length} 筆紀錄，${failCount} 筆失敗`);
      } else {
        clearGuestData();
        toast.success(`已匯入 ${successCount} 筆紀錄`);
      }
      setShowMigration(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "匯入失敗";
      toast.error(message);
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    if (confirm("確定捨棄試用紀錄嗎？此操作無法復原。")) {
      clearGuestData();
      setShowMigration(false);
    }
  };

  return (
    <Dialog open={showMigration} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>匯入試用紀錄？</DialogTitle>
          <DialogDescription>
            你有 {guestExpenses.length} 筆試用期間的消費紀錄。
            要匯入到你的帳號嗎？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} disabled={migrating}>
            不用了
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleMigrate}
            disabled={migrating}
          >
            {migrating ? "匯入中..." : "匯入紀錄"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
