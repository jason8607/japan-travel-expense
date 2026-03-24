"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { ExpenseList } from "@/components/expense/expense-list";
import { MemberSummary } from "@/components/expense/member-summary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function RecordsPage() {
  const { currentTrip, tripMembers, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();
  const [groupBy, setGroupBy] = useState<"date" | "category" | "member">("date");

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <Link
            href="/"
            className="text-sm text-orange-500"
          >
            查看所有旅行消費
          </Link>
        </div>
      </div>

      <div className="px-4 mb-4">
        <Tabs
          value={groupBy}
          onValueChange={(v) => setGroupBy(v as "date" | "category" | "member")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="date" className="flex-1">
              按日期
            </TabsTrigger>
            <TabsTrigger value="category" className="flex-1">
              按類別
            </TabsTrigger>
            <TabsTrigger value="member" className="flex-1">
              按成員
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {groupBy === "member" ? (
        <MemberSummary expenses={expenses} tripMembers={tripMembers} />
      ) : (
        <ExpenseList expenses={expenses} groupBy={groupBy} />
      )}

      <div className="fixed bottom-20 right-4 z-40">
        <Link
          href="/records/new"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
