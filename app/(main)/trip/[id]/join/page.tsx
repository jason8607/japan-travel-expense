"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { toast } from "sonner";
import type { Trip } from "@/types";

export default function JoinTripPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();
  const { user, loading: appLoading, refreshTrips, setCurrentTrip } = useApp();

  const [trip, setTrip] = useState<Pick<Trip, "id" | "name" | "start_date" | "end_date"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/public`);
        if (res.ok) {
          const data = await res.json();
          setTrip(data.trip);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    loadTrip();
  }, [tripId]);

  useEffect(() => {
    if (!appLoading && user && trip) {
      checkMembership();
    }
  }, [appLoading, user, trip]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkMembership = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/trip-members?trip_id=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        const isMember = data.members?.some(
          (m: { user_id: string }) => m.user_id === user.id
        );
        if (isMember) {
          toast.success("你已是此旅程的成員");
          router.push("/");
        }
      }
    } catch {
      // ignore
    }
  };

  const handleJoin = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/trip/${tripId}/join`);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/trips/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id: tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加入失敗");

      toast.success(`已加入「${trip?.name}」`);
      const updatedTrips = await refreshTrips();
      const joinedTrip = updatedTrips.find((t) => t.id === tripId);
      if (joinedTrip) setCurrentTrip(joinedTrip);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加入失敗";
      toast.error(message);
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

  if (error || !trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold mb-2">找不到旅程</h2>
        <p className="text-sm text-muted-foreground">邀請連結可能已失效或旅程不存在</p>
      </div>
    );
  }

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
            登入後加入旅程
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
