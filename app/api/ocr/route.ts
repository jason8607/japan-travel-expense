import { NextRequest, NextResponse } from "next/server";
import { recognizeReceipt } from "@/lib/gemini";
import { getRequestUser } from "@/lib/supabase/auth-helper";

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

    const result = await recognizeReceipt(image, mimeType);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("OCR error:", error);
    const message =
      error instanceof Error ? error.message : "收據辨識失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
