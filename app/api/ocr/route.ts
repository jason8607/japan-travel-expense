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
