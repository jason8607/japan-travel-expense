"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Copy, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { TripMember, Profile } from "@/types";

export default function InvitePage() {
  const params = useParams();
  const tripId = params.id as string;
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<(TripMember & { profile: Profile })[]>(
    []
  );
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMembers = async () => {
    const { data } = await supabase
      .from("trip_members")
      .select("*, profile:profiles(*)")
      .eq("trip_id", tripId);
    if (data) setMembers(data as (TripMember & { profile: Profile })[]);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setInviting(true);

    try {
      const { data: authUsers } = await supabase.rpc("find_user_by_email", {
        target_email: email,
      });

      let userId: string | null = null;
      if (authUsers && authUsers.length > 0) {
        userId = authUsers[0].id;
      }

      if (!userId) {
        toast.error("找不到此 Email 的使用者，請確認對方已註冊");
        setInviting(false);
        return;
      }

      const { error } = await supabase.from("trip_members").insert({
        trip_id: tripId,
        user_id: userId,
        role: "member",
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("此成員已在旅程中");
        } else {
          throw error;
        }
      } else {
        toast.success("已邀請成員加入");
        setEmail("");
        loadMembers();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "邀請失敗";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/trip/${tripId}/join`;
    navigator.clipboard.writeText(link);
    toast.success("邀請連結已複製");
  };

  return (
    <div>
      <PageHeader title="邀請成員" subtitle="邀請旅伴加入記帳" showBack />

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="font-bold flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            目前成員 ({members.length})
          </h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {m.profile?.display_name || "成員"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.role === "owner" ? "建立者" : "成員"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-2">
            <Label>透過 Email 邀請</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="輸入對方的註冊 Email"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600"
            disabled={inviting}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {inviting ? "邀請中..." : "邀請加入"}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="outline" onClick={handleCopyLink} className="w-full">
            <Copy className="h-4 w-4 mr-2" />
            複製邀請連結
          </Button>
        </div>
      </div>
    </div>
  );
}
