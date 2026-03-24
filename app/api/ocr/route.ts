import { NextRequest, NextResponse } from "next/server";
import { recognizeReceipt } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { image, mimeType } = await request.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "缺少圖片資料" },
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
