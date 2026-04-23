"use client";

import { useState, useEffect } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const hasGoogle = user.identities?.some(
        (i: UserIdentity) => i.provider === "google"
      );
      const hasEmail = user.identities?.some(
        (i: UserIdentity) => i.provider === "email"
      );
      if (!hasGoogle || hasEmail) {
        router.replace("/");
        return;
      }
      setChecking(false);
    }
    checkUser();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("密碼至少需要 6 個字元");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("密碼設定成功！現在可以用信箱登入了");
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "發生錯誤";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-sm text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-muted">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-foreground">設定登入密碼</h1>
          <p className="text-sm text-muted-foreground mt-1">
            設定密碼後，也可以用信箱和密碼登入
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 個字元"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">確認密碼</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再輸入一次密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 rounded-lg text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl text-sm font-medium"
            >
              {loading ? "設定中..." : "設定密碼"}
            </Button>
          </form>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full text-sm text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          稍後再說
        </button>
      </div>
    </div>
  );
}
