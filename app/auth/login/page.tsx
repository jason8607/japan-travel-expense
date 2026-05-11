"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Browser } from "@capacitor/browser";
import { isNativeApp } from "@/lib/capacitor";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

function LoginContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const rawRedirect = searchParams.get("redirect") ?? "/";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const handleGoogleLogin = async () => {
    setLoading(true);
    const redirectTo = isNativeApp()
      ? "ryocho://auth/callback"
      : `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: isNativeApp() },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (isNativeApp() && data.url) {
      await Browser.open({ url: data.url });
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || "旅人", avatar_emoji: "🧑" },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (!data.user?.identities?.length) {
          setDuplicateEmail(true);
          setIsSignUp(false);
          return;
        }
        if (data.user && !data.session) {
          toast.success("註冊成功！請查看信箱驗證郵件");
        } else if (data.session) {
          window.location.href = redirect;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = redirect;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "發生錯誤";
      if (message === "Invalid login credentials") {
        toast.error("帳號或密碼錯誤，請重新輸入");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mb-3 inline-flex">
            <Image src="/icon-transparent.png" alt="旅帳" width={64} height={64} priority />
          </div>
          <h1 className="text-2xl font-bold text-foreground">旅帳</h1>
          <p className="text-sm text-muted-foreground mt-1">
            旅遊智慧記帳
          </p>
        </div>

        {/* Duplicate email hint */}
        {duplicateEmail && (
          <div className="rounded-xl border border-warning/30 bg-warning-subtle p-3 text-sm text-warning-foreground">
            <p className="font-medium mb-1">此 Email 已被註冊</p>
            <p className="text-xs text-warning-foreground/80 mb-2">
              此信箱已透過 Google 登入註冊。你可以先用 Google 登入，再設定密碼來啟用信箱登入。
            </p>
            <button
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
                  },
                });
                if (error) {
                  toast.error(error.message);
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full h-9 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 text-xs font-medium transition-colors disabled:opacity-60"
            >
              使用 Google 登入並設定密碼
            </button>
          </div>
        )}

        {/* Email Login */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">暱稱</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="你的暱稱"
                  className="h-10 rounded-lg text-sm"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-10 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字元"
                required
                minLength={6}
                className="h-10 rounded-lg text-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 bg-primary hover:bg-primary/90 rounded-lg text-sm"
              disabled={loading}
            >
              {loading ? "處理中..." : isSignUp ? "註冊" : "登入"}
            </Button>
          </form>

          <div className="mt-3 text-center text-xs">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setDuplicateEmail(false); }}
              className="text-primary hover:underline"
            >
              {isSignUp ? "已有帳號？登入" : "還沒有帳號？註冊"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">或</span>
          <Separator className="flex-1" />
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-12 rounded-xl border border-border bg-card hover:bg-muted flex items-center justify-center gap-3 font-medium text-sm text-foreground transition-colors shadow-sm disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          使用 Google 登入
        </button>

        <p className="text-center text-[10px] text-muted-foreground">
          登入即表示同意使用條款與隱私權政策
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
