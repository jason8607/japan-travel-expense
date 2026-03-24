import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component can't set cookies
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const googleAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
          const googleName = user.user_metadata?.full_name || user.user_metadata?.name;

          if (googleAvatarUrl) {
            const admin = createAdminClient();
            const { data: profile } = await admin
              .from("profiles")
              .select("avatar_url, display_name")
              .eq("id", user.id)
              .single();

            const updates: Record<string, string> = {};
            if (!profile?.avatar_url) {
              updates.avatar_url = googleAvatarUrl;
            }
            if (!profile?.display_name && googleName) {
              updates.display_name = googleName;
            }
            if (Object.keys(updates).length > 0) {
              await admin.from("profiles").update(updates).eq("id", user.id);
            }
          }
        }
      } catch {
        // Non-critical: don't block login if avatar sync fails
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
