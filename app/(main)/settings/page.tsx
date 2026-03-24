"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  User,
  Plane,
  Link2,
  Users,
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile, currentTrip, refreshProfile, loading: ctxLoading } = useApp();
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatar_emoji || "🧑");
  const [notionToken, setNotionToken] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_emoji: avatarEmoji })
      .eq("id", user.id);

    if (error) {
      toast.error("更新失敗");
    } else {
      toast.success("個人資料已更新");
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleSaveNotion = async () => {
    if (!currentTrip) return;
    setSaving(true);
    const { error } = await supabase
      .from("trips")
      .update({
        notion_token: notionToken || null,
        notion_database_id: notionDbId || null,
      })
      .eq("id", currentTrip.id);

    if (error) {
      toast.error("更新失敗");
    } else {
      toast.success("Notion 設定已更新");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  if (ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        載入中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Link
          href="/auth/login"
          className="bg-orange-500 text-white px-6 py-2 rounded-xl"
        >
          請先登入
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-4">
      <h1 className="text-xl font-bold">設定</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            個人資料
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const emojis = ["👨", "👩", "🧑", "👦", "👧", "🧔", "👱", "👲", "🦊", "🐱"];
                const idx = emojis.indexOf(avatarEmoji);
                setAvatarEmoji(emojis[(idx + 1) % emojis.length]);
              }}
              className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl hover:bg-gray-200 transition"
            >
              {avatarEmoji}
            </button>
            <div className="flex-1 space-y-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="暱稱"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveProfile}
            className="w-full bg-orange-500 hover:bg-orange-600"
            disabled={saving}
          >
            儲存個人資料
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4" />
            旅程管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentTrip ? (
            <>
              <div>
                <p className="font-medium">{currentTrip.name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentTrip.start_date} ~ {currentTrip.end_date}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/trip/${currentTrip.id}/schedule`}>
                  <Button variant="outline" className="w-full text-sm">
                    📅 編輯日程
                  </Button>
                </Link>
                <Link href={`/trip/${currentTrip.id}/invite`}>
                  <Button variant="outline" className="w-full text-sm">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    成員管理
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">尚未建立旅程</p>
          )}
          <Link href="/trip/new">
            <Button variant="outline" className="w-full">
              建立新旅程
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Notion 同步
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="notion-token">Integration Token</Label>
            <Input
              id="notion-token"
              type="password"
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
              placeholder="secret_..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notion-db">Database ID</Label>
            <Input
              id="notion-db"
              value={notionDbId}
              onChange={(e) => setNotionDbId(e.target.value)}
              placeholder="從 Notion URL 取得"
            />
          </div>
          <Button
            onClick={handleSaveNotion}
            variant="outline"
            className="w-full"
            disabled={saving || !currentTrip}
          >
            儲存 Notion 設定
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Button
        variant="ghost"
        onClick={handleLogout}
        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        登出
      </Button>
    </div>
  );
}
