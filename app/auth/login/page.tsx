"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const [showEmail, setShowEmail] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || "旅人", avatar_emoji: "🧑" },
          },
        });
        if (error) throw error;
        toast.success("註冊成功！請查看信箱驗證郵件");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "發生錯誤";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="text-5xl mb-3">🗾</div>
          <h1 className="text-2xl font-bold text-slate-800">旅帳</h1>
          <p className="text-sm text-muted-foreground mt-1">
            日本旅遊智慧記帳
          </p>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-3 font-medium text-sm text-slate-700 transition-colors shadow-sm disabled:opacity-60"
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

        {/* Divider */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">或</span>
          <Separator className="flex-1" />
        </div>

        {/* Email Login */}
        {!showEmail ? (
          <button
            onClick={() => setShowEmail(true)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-600 transition-colors"
          >
            <Mail className="h-4 w-4" />
            使用 Email 登入
          </button>
        ) : (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs text-slate-500">暱稱</Label>
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
                <Label htmlFor="email" className="text-xs text-slate-500">Email</Label>
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
                <Label htmlFor="password" className="text-xs text-slate-500">密碼</Label>
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
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm"
                disabled={loading}
              >
                {loading ? "處理中..." : isSignUp ? "註冊" : "登入"}
              </Button>
            </form>

            <div className="mt-3 text-center text-xs">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-orange-500 hover:underline"
              >
                {isSignUp ? "已有帳號？登入" : "還沒有帳號？註冊"}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground">
          登入即表示同意使用條款與隱私權政策
        </p>
      </div>
    </div>
  );
}
