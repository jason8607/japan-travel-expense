"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/context";
import { toast } from "sonner";
import type { Trip } from "@/types";

export default function JoinTripPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();
  const { user, loading: appLoading } = useApp();
  const supabase = createClient();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!appLoading && user && trip) {
      checkMembership();
    }
  }, [appLoading, user, trip]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrip = async () => {
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();
    setTrip(data);
    setLoading(false);
  };

  const checkMembership = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();
    if (data) {
      setAlreadyMember(true);
      toast.success("你已是此旅程的成員");
      router.push("/");
    }
  };

  const handleJoin = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/trip/${tripId}/join`);
      return;
    }
    setJoining(true);
    try {
      const { error } = await supabase.from("trip_members").insert({
        trip_id: tripId,
        user_id: user.id,
        role: "member",
      });
      if (error) throw error;
      toast.success(`已加入「${trip?.name}」`);
      router.push("/");
    } catch {
      toast.error("加入失敗，請重試");
    } finally {
      setJoining(false);
    }
  };

  if (loading || appLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-4xl animate-bounce">✈️</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold mb-2">找不到旅程</h2>
        <p className="text-sm text-muted-foreground">邀請連結可能已失效</p>
      </div>
    );
  }

  if (alreadyMember) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">✈️</div>
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {trip.start_date} ～ {trip.end_date}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-center text-muted-foreground">
          你被邀請加入這趟旅程的記帳，加入後可以一起記錄消費。
        </div>

        {!user ? (
          <button
            onClick={handleJoin}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium"
          >
            Google 登入後加入
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60"
          >
            {joining ? "加入中..." : "加入旅程"}
          </button>
        )}
      </div>
    </div>
  );
}
