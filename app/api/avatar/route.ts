import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/auth-helper";

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "缺少檔案" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = admin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = data.publicUrl + "?t=" + Date.now();

    await admin
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
