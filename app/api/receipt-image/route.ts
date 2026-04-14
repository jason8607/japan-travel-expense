import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
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

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "檔案過大，請上傳 5MB 以下的圖片" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const MAGIC_BYTES: Record<string, number[]> = {
      "image/jpeg": [0xFF, 0xD8, 0xFF],
      "image/png": [0x89, 0x50, 0x4E, 0x47],
      "image/webp": [0x52, 0x49, 0x46, 0x46],
    };

    const detectedType = Object.entries(MAGIC_BYTES).find(([, bytes]) =>
      bytes.every((b, i) => buffer[i] === b)
    )?.[0];

    if (!detectedType) {
      return NextResponse.json({ error: "檔案不是有效的圖片格式" }, { status: 400 });
    }

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = MIME_TO_EXT[detectedType];
    const filename = `${user.id}/${Date.now()}.${ext}`;

    const admin = getAdminClient();

    const { error: uploadError } = await admin.storage
      .from("receipts")
      .upload(filename, buffer, {
        contentType: detectedType,
      });

    if (uploadError) {
      console.error("receipt upload error:", uploadError.message);
      return NextResponse.json({ error: "收據上傳失敗" }, { status: 500 });
    }

    const { data } = admin.storage.from("receipts").getPublicUrl(filename);

    return NextResponse.json({ imageUrl: data.publicUrl });
  } catch (err) {
    console.error("receipt upload error:", err);
    return NextResponse.json({ error: "上傳失敗" }, { status: 500 });
  }
}
