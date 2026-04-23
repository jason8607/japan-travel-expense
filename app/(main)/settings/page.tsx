"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  User,
  Plane,
  Check,
  UserPlus,
  Copy,
  Pencil,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/ui/avatar-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateGuestTrip } from "@/lib/guest-storage";
import { CreditCardManager } from "@/components/settings/credit-card-manager";
import { CategoryManager } from "@/components/settings/category-manager";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import type { Trip, TripMember, Profile } from "@/types";

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

  // Member invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<(TripMember & { profile?: Profile })[]>([]);

  // Remove member dialog
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

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
    router.push("/auth/login");
    router.refresh();
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
    toast.success("旅程已更新");
  };

  if (ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        載入中...
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Link
          href="/auth/login"
          className="bg-primary text-white px-6 py-2 rounded-xl"
        >
          請先登入
        </Link>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="space-y-4 p-4 pb-4">
        <h1 className="text-xl font-bold">設定</h1>

        {/* Guest trip editing */}
        {currentTrip && (
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                試用旅程
              </h2>
              {!editingTrip ? (
                <button
                  onClick={() => setEditingTrip(true)}
                  className="text-xs text-primary flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  編輯
                </button>
              ) : (
                <button
                  onClick={() => setEditingTrip(false)}
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  取消
                </button>
              )}
            </div>

            {editingTrip ? (
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">旅程名稱</Label>
                  <Input
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">開始日期</Label>
                    <Input
                      type="date"
                      value={tripStart}
                      onChange={(e) => setTripStart(e.target.value)}
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">結束日期</Label>
                    <Input
                      type="date"
                      value={tripEnd}
                      onChange={(e) => setTripEnd(e.target.value)}
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">旅程預算 (¥)</Label>
                  <Input
                    type="number"
                    value={tripBudget}
                    onChange={(e) => setTripBudget(e.target.value)}
                    placeholder="選填"
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
                <Button
                  onClick={handleSaveGuestTrip}
                  className="w-full h-10 bg-primary hover:bg-primary/90 rounded-lg text-sm"
                  disabled={saving}
                >
                  {saving ? "儲存中..." : "儲存變更"}
                </Button>
              </div>
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
            )}
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
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" />
          結束試用
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-4">
      <h1 className="text-xl font-bold">設定</h1>

      {/* ===== 旅程切換 ===== */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            我的旅程
          </h2>
        </div>
        <div className="divide-y divide-border/60">
          {trips.map((trip) => {
            const isActive = trip.id === currentTrip?.id;
            return (
              <button
                key={trip.id}
                onClick={() => handleSwitchTrip(trip)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
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
                  <p className="text-[11px] text-muted-foreground">
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
        <div className="px-4 py-3 border-t border-border/60">
          <Link href="/trip/new">
            <Button variant="outline" size="sm" className="w-full text-sm rounded-lg">
              + 建立新旅程
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== 當前旅程編輯 + 成員 ===== */}
      {currentTrip && (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-bold">旅程設定</h2>
            {!editingTrip ? (
              <button
                onClick={() => setEditingTrip(true)}
                className="text-xs text-primary flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                編輯
              </button>
            ) : (
              <button
                onClick={() => setEditingTrip(false)}
                className="text-xs text-muted-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                取消
              </button>
            )}
          </div>

          {editingTrip ? (
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">旅程名稱</Label>
                <Input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="h-10 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">開始日期</Label>
                  <Input
                    type="date"
                    value={tripStart}
                    onChange={(e) => setTripStart(e.target.value)}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">結束日期</Label>
                  <Input
                    type="date"
                    value={tripEnd}
                    onChange={(e) => setTripEnd(e.target.value)}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">旅程預算 (¥)</Label>
                <Input
                  type="number"
                  value={tripBudget}
                  onChange={(e) => setTripBudget(e.target.value)}
                  placeholder="選填"
                  className="h-10 rounded-lg text-sm"
                />
              </div>
              <Button
                onClick={handleSaveTrip}
                className="w-full h-10 bg-primary hover:bg-primary/90 rounded-lg text-sm"
                disabled={saving}
              >
                {saving ? "儲存中..." : "儲存變更"}
              </Button>
            </div>
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
          )}

          {/* 成員列表 */}
          <div className="border-t border-border/60">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                成員 ({members.length || tripMembers.length})
              </span>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="text-xs text-primary flex items-center gap-1"
              >
                <UserPlus className="h-3 w-3" />
                {showInvite ? "收起" : "邀請"}
              </button>
            </div>
            <div className="px-4 pb-3 space-y-2">
              {(members.length > 0 ? members : tripMembers).map((m) => (
                <div key={m.user_id} className="flex items-center gap-2.5">
                  <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="sm" />
                  <span className="text-sm flex-1">
                    {m.profile?.display_name || "成員"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {m.role === "owner" ? "建立者" : "成員"}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <button
                      onClick={() => setRemoveTarget({ userId: m.user_id, name: m.profile?.display_name || "成員" })}
                      className="p-1 text-muted-foreground/60 hover:text-red-500 transition-colors"
                      aria-label={`移除${m.profile?.display_name || "成員"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {showInvite && (
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
          </div>
        </div>
      )}

      {/* ===== 信用卡管理 ===== */}
      <CreditCardManager />

      {/* ===== 分類管理 ===== */}
      <CategoryManager />

      {/* ===== 外觀主題 ===== */}
      <ThemeSwitcher />

      {/* ===== 個人資料 ===== */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            個人資料
          </h2>
        </div>
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
            儲存個人資料
          </Button>
        </div>
      </div>

      <Separator />

      <Button
        variant="ghost"
        onClick={handleLogout}
        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
      >
        <LogOut className="h-4 w-4 mr-2" />
        登出
      </Button>

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
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleRemoveMember}
            >
              確定移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
