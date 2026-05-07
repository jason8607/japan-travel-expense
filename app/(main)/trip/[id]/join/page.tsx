"use client";

import { LoadingState } from "@/components/layout/loading-state";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useApp } from "@/lib/context";
import type { Trip } from "@/types";
import { Plane } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PublicTrip = Pick<Trip, "id" | "name" | "start_date" | "end_date">;

interface InviterProfile {
  display_name: string;
  avatar_url: string | null;
  avatar_emoji: string;
}

export default function JoinTripPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoJoin = searchParams.get("autoJoin") === "1";
  const { user, loading: appLoading, refreshTrips, setCurrentTrip } = useApp();

  const [trip, setTrip] = useState<PublicTrip | null>(null);
  const [owner, setOwner] = useState<InviterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(false);
  const autoJoinAttemptedRef = useRef(false);

  const loadTrip = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`/api/trips/${tripId}/public`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setTrip(data.trip);
      setOwner(data.owner ?? null);
    } catch {
      setError(true);
    }
  }, [tripId]);

  useEffect(() => {
    (async () => {
      await loadTrip();
      setLoading(false);
    })();
  }, [loadTrip]);

  const performJoin = useCallback(async () => {
    if (!user || !trip) return;
    setJoining(true);
    try {
      const res = await fetch("/api/trips/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id: tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加入失敗,請稍後再試");

      toast.success(`已加入「${trip.name}」`);
      const updatedTrips = await refreshTrips();
      const joinedTrip = updatedTrips.find((t) => t.id === tripId);
      if (joinedTrip) setCurrentTrip(joinedTrip);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "加入失敗,請稍後再試";
      toast.error(message);
    } finally {
      setJoining(false);
    }
  }, [user, trip, tripId, refreshTrips, setCurrentTrip, router]);

  useEffect(() => {
    if (appLoading || !user || !trip || joining) return;

    const checkAndAct = async () => {
      try {
        const res = await fetch(`/api/trip-members?trip_id=${tripId}`);
        if (!res.ok) return;
        const data = await res.json();
        const isMember = data.members?.some(
          (m: { user_id: string }) => m.user_id === user.id
        );

        if (isMember) {
          const updatedTrips = await refreshTrips();
          const memberTrip = updatedTrips.find((t) => t.id === tripId);
          if (memberTrip) setCurrentTrip(memberTrip);
          toast.success(`你已是「${trip.name}」的成員`);
          router.push("/");
          return;
        }

        if (autoJoin && !autoJoinAttemptedRef.current) {
          autoJoinAttemptedRef.current = true;
          await performJoin();
        }
      } catch {
        // ignore — fall through to manual join action
      }
    };
    checkAndAct();
  }, [
    appLoading,
    user,
    trip,
    tripId,
    autoJoin,
    joining,
    refreshTrips,
    setCurrentTrip,
    router,
    performJoin,
  ]);

  const handleRetry = async () => {
    setRetrying(true);
    await loadTrip();
    setRetrying(false);
  };

  const handleJoin = () => {
    if (!user) {
      const target = `/trip/${tripId}/join?autoJoin=1`;
      router.push(`/auth/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    performJoin();
  };

  const handleDecline = () => {
    if (user) router.back();
    else router.push("/");
  };

  if (loading || appLoading) {
    return <LoadingState />;
  }

  if (error || !trip) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-bold">找不到旅程</h1>
            <p className="text-sm text-muted-foreground mt-2">
              邀請連結可能已失效,或這趟旅程已被刪除。
            </p>
          </div>
          <div className="space-y-2">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium"
              disabled={retrying}
              onClick={handleRetry}
            >
              {retrying ? "重試中..." : "重試"}
            </Button>
            <Button
              size="lg"
              className="w-full h-12 rounded-xl text-base font-medium"
              onClick={() => router.push("/")}
            >
              返回首頁
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {owner && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <UserAvatar
              avatarUrl={owner.avatar_url}
              avatarEmoji={owner.avatar_emoji}
              name={owner.display_name}
              size="xs"
            />
            <span>
              <span className="font-medium text-foreground">
                {owner.display_name}
              </span>
              <span> 邀請你加入</span>
            </span>
          </div>
        )}

        <div className="text-center">
          <Plane
            className="mx-auto h-12 w-12 text-foreground mb-3"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {trip.start_date} ～ {trip.end_date}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm text-sm text-center text-muted-foreground">
          你被邀請加入這趟旅程的記帳,加入後可以一起記錄消費。
        </div>

        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full h-12 rounded-xl text-base font-medium"
            disabled={joining}
            onClick={handleJoin}
          >
            {!user
              ? "登入後加入旅程"
              : joining
                ? "加入中..."
                : "加入旅程"}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full h-12 rounded-xl text-base font-medium"
            disabled={joining}
            onClick={handleDecline}
          >
            不是現在
          </Button>
        </div>
      </div>
    </div>
  );
}
