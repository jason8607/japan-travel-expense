"use client";

import { AuthRequiredState } from "@/components/layout/auth-required-state";
import { LoadingState } from "@/components/layout/loading-state";
import { CategoryManager } from "@/components/settings/category-manager";
import { CreditCardManager } from "@/components/settings/credit-card-manager";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { TripEditForm } from "@/components/settings/trip-edit-form";
import { TripForm } from "@/components/trip/trip-form";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isNativeApp } from "@/lib/capacitor";
import { useApp } from "@/lib/context";
import { saveGuestMemberBudgets, updateGuestTrip } from "@/lib/guest-storage";
import { widgetSync } from "@/lib/native/widget-sync";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile, Trip, TripMember } from "@/types";
import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Pencil,
  Plane,
  Plus,
  Settings as SettingsIcon,
  SlidersHorizontal,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const {
    user,
    profile,
    trips,
    currentTrip,
    tripMembers,
    isGuest,
    setCurrentTrip,
    exitGuestMode,
    refreshProfile,
    refreshTrips,
    refreshTrip,
    loading: ctxLoading,
  } = useApp();
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatar_emoji || "🧑");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);

  // Trip editing
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripPersonalTotal, setTripPersonalTotal] = useState("");
  const [tripPersonalDaily, setTripPersonalDaily] = useState("");

  // Section open/close state
  const [guestTripOpen, setGuestTripOpen] = useState(true);
  const [tripsOpen, setTripsOpen] = useState(true);
  const [tripSettingsOpen, setTripSettingsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);

  // Member invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<(TripMember & { profile?: Profile })[]>([]);

  // Remove member dialog
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  // Delete trip dialog
  const [deleteTripTarget, setDeleteTripTarget] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState(false);

  // New trip inline form (same expand pattern as 旅程設定 → 編輯)
  const [creatingNewTrip, setCreatingNewTrip] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripStart, setNewTripStart] = useState("");
  const [newTripEnd, setNewTripEnd] = useState("");
  const [newTripBudget, setNewTripBudget] = useState("");
  const [newTripSaving, setNewTripSaving] = useState(false);

  const resetNewTripForm = useCallback(() => {
    setNewTripName("");
    setNewTripStart("");
    setNewTripEnd("");
    setNewTripBudget("");
  }, []);

  const startCreatingNewTrip = useCallback(() => {
    setEditingTrip(false);
    resetNewTripForm();
    setCreatingNewTrip(true);
  }, [resetNewTripForm]);

  const cancelCreatingNewTrip = useCallback(() => {
    if (newTripSaving) return;
    setCreatingNewTrip(false);
    resetNewTripForm();
  }, [newTripSaving, resetNewTripForm]);

  const toggleTripsOpen = useCallback(() => {
    if (tripsOpen) {
      setCreatingNewTrip(false);
      resetNewTripForm();
    }
    setTripsOpen(!tripsOpen);
  }, [tripsOpen, resetNewTripForm]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarEmoji(profile.avatar_emoji || "🧑");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (currentTrip) {
      setTripName(currentTrip.name);
      setTripStart(currentTrip.start_date);
      setTripEnd(currentTrip.end_date);
      setTripBudget(currentTrip.budget_jpy?.toString() || "");
      if (!isGuest) loadMembers(currentTrip.id);
    }
  }, [currentTrip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const selfId = isGuest ? "guest" : (user?.id ?? null);
    if (!selfId) return;
    const self = tripMembers.find((m) => m.user_id === selfId);
    if (!self) return;
    setTripPersonalTotal(self.total_budget_jpy?.toString() ?? "");
    setTripPersonalDaily(self.daily_budget_jpy?.toString() ?? "");
  }, [tripMembers, user?.id, isGuest]);  

  const loadMembers = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trip-members?trip_id=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.members && currentTrip?.id === tripId) setMembers(data.members);
      }
    } catch {
      // ignore
    }
  };

  const handleSwitchTrip = (trip: Trip) => {
    setCurrentTrip(trip);
    setEditingTrip(false);
    setCreatingNewTrip(false);
    resetNewTripForm();
    setShowInvite(false);
    toast.success(`已切換至「${trip.name}」`);
  };

  const handleUploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上傳失敗");
      return data.avatarUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "上傳失敗";
      toast.error(message);
      return null;
    }
  };

  const cancelEditProfile = () => {
    setDisplayName(profile?.display_name || "");
    setAvatarEmoji(profile?.avatar_emoji || "🧑");
    setAvatarUrl(profile?.avatar_url || null);
    setEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        avatar_emoji: avatarEmoji,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("更新失敗");
    } else {
      toast.success("個人資料已更新");
      setEditingProfile(false);
      await refreshProfile();
      await refreshTrip();
      if (currentTrip) loadMembers(currentTrip.id);
    }
    setSaving(false);
  };

  const handleSaveTrip = async () => {
    if (!currentTrip) return;
    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentTrip.id,
          name: tripName,
          start_date: tripStart,
          end_date: tripEnd,
          budget_jpy: tripBudget ? Number(tripBudget) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失敗");

      setCurrentTrip(data.trip);
      // Save personal budget for current user
      await fetch("/api/trip-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: currentTrip.id,
          total_budget_jpy: tripPersonalTotal ? Number(tripPersonalTotal) : null,
          daily_budget_jpy: tripPersonalDaily ? Number(tripPersonalDaily) : null,
        }),
      });
      await refreshTrips();
      setEditingTrip(false);
      toast.success("旅程已更新");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!deleteTripTarget) return;
    const target = deleteTripTarget;
    setDeletingTrip(true);
    try {
      const res = await fetch(`/api/trips?id=${target.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "刪除失敗");

      const remaining = await refreshTrips();
      if (currentTrip?.id === target.id) {
        const next = remaining.find((t: Trip) => t.id !== target.id) || null;
        setCurrentTrip(next);
      }
      setEditingTrip(false);
      setDeleteTripTarget(null);
      toast.success(`已刪除「${target.name}」`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    } finally {
      setDeletingTrip(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentTrip) return;
    setInviting(true);

    try {
      const res = await fetch("/api/trip-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id: currentTrip.id, email: inviteEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "邀請失敗");
      } else {
        toast.success("已邀請成員加入");
        setInviteEmail("");
        if (currentTrip) loadMembers(currentTrip.id);
        await refreshTrip();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "邀請失敗";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const isOwner = members.some(
    (m) => m.user_id === user?.id && m.role === "owner"
  ) || tripMembers.some(
    (m) => m.user_id === user?.id && m.role === "owner"
  );

  const handleRemoveMember = async () => {
    if (!currentTrip || !removeTarget) return;
    const { userId: targetUserId, name: targetName } = removeTarget;
    setRemoveTarget(null);

    try {
      const res = await fetch("/api/trip-members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: currentTrip.id,
          user_id: targetUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "移除失敗");

      toast.success(`已移除「${targetName}」`);
      if (currentTrip) loadMembers(currentTrip.id);
      await refreshTrip();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "移除失敗";
      toast.error(message);
    }
  };

  const handleCopyLink = async () => {
    if (!currentTrip) return;
    const link = `${window.location.origin}/trip/${currentTrip.id}/join`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("邀請連結已複製");
    } catch {
      toast.error("複製失敗，請手動複製連結");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (isNativeApp()) {
      await widgetSync.clear();
    }
    router.push("/auth/login");
    router.refresh();
  };

  const handleCreateNewTrip = async () => {
    if (!user) {
      toast.error("請先登入");
      return;
    }
    if (!newTripName.trim()) {
      toast.error("請輸入旅程名稱");
      return;
    }
    if (!newTripStart || !newTripEnd) {
      toast.error("請選擇旅程日期");
      return;
    }
    setNewTripSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTripName.trim(),
          start_date: newTripStart,
          end_date: newTripEnd,
          budget_jpy: newTripBudget ? Number(newTripBudget) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "建立失敗");

      await refreshTrips();
      setCurrentTrip(data.trip);
      toast.success("旅程已建立");
      setCreatingNewTrip(false);
      resetNewTripForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "建立失敗";
      toast.error(message);
    } finally {
      setNewTripSaving(false);
    }
  };

  const handleSaveGuestTrip = () => {
    if (!currentTrip) return;
    setSaving(true);
    const updated = updateGuestTrip({
      name: tripName,
      start_date: tripStart,
      end_date: tripEnd,
      budget_jpy: tripBudget ? Number(tripBudget) : null,
    });
    if (!updated) {
      setSaving(false);
      toast.error("結束日期不能早於開始日期");
      return;
    }
    setCurrentTrip(updated);
    setEditingTrip(false);
    setSaving(false);
    saveGuestMemberBudgets({
      total_budget_jpy: tripPersonalTotal ? Number(tripPersonalTotal) : null,
      daily_budget_jpy: tripPersonalDaily ? Number(tripPersonalDaily) : null,
    });
    toast.success("旅程已更新");
  };

  if (ctxLoading) {
    return <LoadingState />;
  }

  if (!user && !isGuest) {
    return (
      <AuthRequiredState
        icon={SettingsIcon}
        description="登入後可以管理旅程、成員、信用卡方案與個人設定。"
      />
    );
  }

  if (isGuest) {
    return (
      <div className="pb-4">
        <div className="space-y-4 px-4">

        {/* Guest trip editing */}
        {currentTrip && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
            <div className={`px-4 py-3 flex items-center gap-2 ${guestTripOpen ? "border-b border-border/60" : ""}`}>
              <button
                onClick={() => setGuestTripOpen(!guestTripOpen)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left"
              >
                <Plane className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">試用旅程</span>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {guestTripOpen && (!editingTrip ? (
                  <button
                    onClick={() => setEditingTrip(true)}
                    className="text-xs text-primary flex items-center gap-1 rounded transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                  >
                    <Pencil className="h-3 w-3" />
                    編輯
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingTrip(false)}
                    className="text-xs text-muted-foreground flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                  >
                    <X className="h-3 w-3" />
                    取消
                  </button>
                ))}
                <button onClick={() => setGuestTripOpen(!guestTripOpen)}>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${guestTripOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {guestTripOpen && (editingTrip ? (
              <TripEditForm
                name={tripName}
                startDate={tripStart}
                endDate={tripEnd}
                budget={tripBudget}
                saving={saving}
                onChangeName={setTripName}
                onChangeStartDate={setTripStart}
                onChangeEndDate={setTripEnd}
                onChangeBudget={setTripBudget}
                onSubmit={handleSaveGuestTrip}
                personalTotal={tripPersonalTotal}
                personalDaily={tripPersonalDaily}
                onChangePersonalTotal={setTripPersonalTotal}
                onChangePersonalDaily={setTripPersonalDaily}
              />
            ) : (
              <div className="px-4 py-3">
                <p className="font-medium text-sm">{currentTrip.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentTrip.start_date} ~ {currentTrip.end_date}
                  {currentTrip.budget_jpy && (
                    <> · 總預算 ¥{currentTrip.budget_jpy.toLocaleString()}</>
                  )}
                </p>
              </div>
            ))}


          </div>
        )}

        <CreditCardManager />
        <CategoryManager />
        <ThemeSwitcher />

        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-center">
          <p className="text-sm text-primary mb-3">
            登入後可永久保存資料、多人分帳、AI 收據辨識
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            登入 / 註冊
          </Link>
        </div>

        <Separator />

        <Button
          variant="ghost"
          onClick={() => { exitGuestMode(); router.push("/"); }}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" />
          結束試用
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="space-y-4 px-4">

      {/* ===== 旅程切換 ===== */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className={`px-4 py-3 flex items-center gap-2 ${tripsOpen ? "border-b border-border/60" : ""}`}>
          <button
            type="button"
            onClick={toggleTripsOpen}
            className="flex-1 flex items-center gap-2 min-w-0 text-left"
          >
            <Plane className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">我的旅程</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {tripsOpen && (!creatingNewTrip ? (
              <button
                type="button"
                onClick={startCreatingNewTrip}
                className="text-xs text-primary flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                新增
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelCreatingNewTrip}
                disabled={newTripSaving}
                className="text-xs text-muted-foreground flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                取消
              </button>
            ))}
            <button type="button" onClick={toggleTripsOpen}>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${tripsOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {tripsOpen && (
          <>
          <div className="divide-y divide-border/60">
          {trips.map((trip) => {
            const isActive = trip.id === currentTrip?.id;
            return (
              <button
                key={trip.id}
                onClick={() => handleSwitchTrip(trip)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:translate-y-px",
                  isActive ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {trip.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trip.start_date} ~ {trip.end_date}
                  </p>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
          {creatingNewTrip && (
            <div className="border-t border-border/60">
              <TripForm
                name={newTripName}
                startDate={newTripStart}
                endDate={newTripEnd}
                budget={newTripBudget}
                saving={newTripSaving}
                submitLabel="建立旅程"
                savingLabel="建立中…"
                onChangeName={setNewTripName}
                onChangeStartDate={setNewTripStart}
                onChangeEndDate={setNewTripEnd}
                onChangeBudget={setNewTripBudget}
                onSubmit={handleCreateNewTrip}
              />
            </div>
          )}
          </>
        )}
      </div>

      {/* ===== 當前旅程編輯 + 成員 ===== */}
      {currentTrip && (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className={`px-4 py-3 flex items-center gap-2 ${tripSettingsOpen ? "border-b border-border/60" : ""}`}>
            <button
              onClick={() => setTripSettingsOpen(!tripSettingsOpen)}
              className="flex-1 flex items-center gap-2 min-w-0 text-left"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">旅程設定</span>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {tripSettingsOpen && isOwner && (!editingTrip ? (
                <button
                  onClick={() => {
                    setCreatingNewTrip(false);
                    resetNewTripForm();
                    setEditingTrip(true);
                  }}
                  className="text-xs text-primary flex items-center gap-1 rounded transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                >
                  <Pencil className="h-3 w-3" />
                  編輯
                </button>
              ) : (
                <button
                  onClick={() => setEditingTrip(false)}
                  className="text-xs text-muted-foreground flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                >
                  <X className="h-3 w-3" />
                  取消
                </button>
              ))}
              <button onClick={() => setTripSettingsOpen(!tripSettingsOpen)}>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${tripSettingsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {tripSettingsOpen && (isOwner && editingTrip ? (
            <TripEditForm
              name={tripName}
              startDate={tripStart}
              endDate={tripEnd}
              budget={tripBudget}
              saving={saving}
              onChangeName={setTripName}
              onChangeStartDate={setTripStart}
              onChangeEndDate={setTripEnd}
              onChangeBudget={setTripBudget}
              onSubmit={handleSaveTrip}
              onDelete={isOwner ? () => setDeleteTripTarget(currentTrip) : undefined}
              personalTotal={tripPersonalTotal}
              personalDaily={tripPersonalDaily}
              onChangePersonalTotal={setTripPersonalTotal}
              onChangePersonalDaily={setTripPersonalDaily}
            />
          ) : (
            <div className="px-4 py-3">
              <p className="font-medium text-sm">{currentTrip.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentTrip.start_date} ~ {currentTrip.end_date}
                {currentTrip.budget_jpy && (
                  <> · 總預算 ¥{currentTrip.budget_jpy.toLocaleString()}</>
                )}
              </p>
            </div>
          ))}

          {tripSettingsOpen && <div className="border-t border-border/60">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                成員 ({members.length || tripMembers.length})
              </span>
              {isOwner && (
                <button
                  onClick={() => setShowInvite(!showInvite)}
                  className="text-xs text-primary flex items-center gap-1 rounded transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                >
                  <UserPlus className="h-3 w-3" />
                  {showInvite ? "收起" : "邀請"}
                </button>
              )}
            </div>
            <div className="px-4 pb-3 space-y-2">
              {(members.length > 0 ? members : tripMembers).map((m) => (
                <div key={m.user_id} className="flex items-center gap-2.5">
                  <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="sm" />
                  <span className="text-sm flex-1">
                    {m.profile?.display_name || "成員"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {m.role === "owner" ? "建立者" : "成員"}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <button
                      onClick={() => setRemoveTarget({ userId: m.user_id, name: m.profile?.display_name || "成員" })}
                      className="p-1 rounded text-muted-foreground/60 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                      aria-label={`移除${m.profile?.display_name || "成員"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isOwner && showInvite && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/60 pt-3">
                <form onSubmit={handleInvite} className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="對方的 Email"
                    className="flex-1 h-9 text-sm rounded-lg"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 rounded-lg h-9 px-3"
                    disabled={inviting}
                  >
                    {inviting ? "..." : "邀請"}
                  </Button>
                </form>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full text-xs rounded-lg h-8"
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  複製邀請連結
                </Button>
              </div>
            )}
          </div>}
        </div>
      )}

      {/* ===== 信用卡管理 ===== */}
      <CreditCardManager />

      {/* ===== 分類管理 ===== */}
      <CategoryManager />

      {/* ===== 通知 ===== */}
      <NotificationSettings />

      {/* ===== 外觀主題 ===== */}
      <ThemeSwitcher />

      {/* ===== 個人資料 ===== */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className={`px-4 py-3 flex items-center gap-2 ${profileOpen ? "border-b border-border/60" : ""}`}>
          <button
            type="button"
            onClick={() => { setProfileOpen(!profileOpen); if (profileOpen) setEditingProfile(false); }}
            className="flex-1 flex items-center gap-2 min-w-0 text-left"
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">個人資料</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {profileOpen && (!editingProfile ? (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="text-xs text-primary flex items-center gap-1 rounded transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
              >
                <Pencil className="h-3 w-3" />
                編輯
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEditProfile}
                disabled={saving}
                className="text-xs text-muted-foreground flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                取消
              </button>
            ))}
            <button type="button" onClick={() => { setProfileOpen(!profileOpen); if (profileOpen) setEditingProfile(false); }}>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {profileOpen && (
          editingProfile ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <AvatarPicker
                  avatarUrl={avatarUrl}
                  avatarEmoji={avatarEmoji}
                  onChangeEmoji={setAvatarEmoji}
                  onChangeUrl={setAvatarUrl}
                  onUpload={handleUploadAvatar}
                />
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">暱稱</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="你的暱稱"
                    maxLength={50}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveProfile}
                className="w-full h-10 bg-primary hover:bg-primary/90 rounded-lg text-sm"
                disabled={saving}
              >
                {saving ? "儲存中..." : "儲存個人資料"}
              </Button>
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center gap-3">
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                avatarEmoji={profile?.avatar_emoji}
                size="md"
              />
              <p className="text-sm font-medium">{profile?.display_name || "未設定暱稱"}</p>
            </div>
          )
        )}
      </div>

      <Separator />

      <Button
        variant="ghost"
        onClick={handleLogout}
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
      >
        <LogOut className="h-4 w-4 mr-2" />
        登出
      </Button>
      </div>

      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確定要移除成員？</DialogTitle>
            <DialogDescription>
              將移除「{removeTarget?.name}」，該成員的消費紀錄會轉移給建立者。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              確定移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTripTarget}
        onOpenChange={(open) => {
          if (!open && !deletingTrip) setDeleteTripTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確定要刪除此旅程？</DialogTitle>
            <DialogDescription>
              將永久刪除「{deleteTripTarget?.name}」以及其所有消費紀錄與成員資料，此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTripTarget(null)}
              disabled={deletingTrip}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTrip}
              disabled={deletingTrip}
            >
              {deletingTrip ? "刪除中..." : "確定刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
