import { NextRequest, NextResponse } from "next/server";
import { recognizeReceipt } from "@/lib/gemini";
import { getRequestUser } from "@/lib/supabase/auth-helper";
import { getAdminClient } from "@/lib/supabase/admin";

const DAILY_LIMIT_PER_USER = 50;
const MINUTE_LIMIT = 5;
// Warm-instance burst protection only; resets on cold start in serverless.
// Primary protection is the DB-backed daily limit in checkAndRecordUsage.
const rateLimitMap = new Map<string, number[]>();

function isMinuteRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < 60_000);
  if (recent.length >= MINUTE_LIMIT) return true;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return false;
}

async function checkAndRecordUsage(admin: ReturnType<typeof getAdminClient>, userId: string): Promise<{ allowed: boolean; count: number }> {
  const today = new Date().toISOString().slice(0, 10);

  const { count, error: countError } = await admin
    .from("ocr_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00.000Z`);

  if (countError) {
    console.error("ocr_usage count error:", countError.message);
    return { allowed: false, count: -1 };
  }

  const current = count ?? 0;
  if (current >= DAILY_LIMIT_PER_USER) {
    return { allowed: false, count: current };
  }

  const { error: insertError } = await admin.from("ocr_usage").insert({ user_id: userId });
  if (insertError) {
    console.error("ocr_usage insert error:", insertError.message);
    return { allowed: false, count: -1 };
  }

  return { allowed: true, count: current + 1 };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { image, mimeType } = await request.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "缺少圖片資料" },
        { status: 400 }
      );
    }

    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "不支援的圖片格式" },
        { status: 400 }
      );
    }

    const MAX_BASE64_LENGTH = 10 * 1024 * 1024;
    if (typeof image !== "string" || image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "圖片過大，請上傳 10MB 以下的圖片" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "未設定 Gemini API Key，請到設定頁面配置" },
        { status: 500 }
      );
    }

    if (isMinuteRateLimited(user.id)) {
      return NextResponse.json(
        { error: "辨識太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const admin = getAdminClient();

    const { allowed, count } = await checkAndRecordUsage(admin, user.id);
    if (!allowed) {
      const msg = count === -1
        ? "系統忙碌中，請稍後再試"
        : `今日辨識已達上限（${DAILY_LIMIT_PER_USER} 次），明天再試`;
      return NextResponse.json({ error: msg }, { status: 429 });
    }

    const result = await recognizeReceipt(image, mimeType);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("OCR error:", error);
    const raw = error instanceof Error ? error.message : "";
    let message = "收據辨識失敗，請重新拍照試試";

    if (raw.includes("429") || raw.includes("quota")) {
      message = "AI 辨識額度已用完，請稍後再試";
    } else if (raw.includes("404") || raw.includes("no longer available")) {
      message = "AI 模型暫時無法使用，請稍後再試";
    } else if (raw.includes("400") || raw.includes("INVALID_ARGUMENT")) {
      message = "圖片無法辨識，請確認是清晰的收據照片";
    } else if (raw.includes("403") || raw.includes("PERMISSION_DENIED")) {
      message = "API 金鑰權限不足，請聯繫管理員";
    } else if (raw.includes("500") || raw.includes("INTERNAL")) {
      message = "AI 服務暫時異常，請稍後再試";
    } else if (raw.includes("無法解析") || raw.includes("格式不符")) {
      message = "無法辨識收據內容，請確認圖片是日本收據";
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
