import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OCRResult } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

const RECEIPT_PROMPT = `你是一個日本收據辨識專家。請分析這張收據圖片，擷取以下資訊並翻譯成繁體中文。

請以 JSON 格式回傳，格式如下：
{
  "store_name_ja": "日文店名原文",
  "store_name": "繁體中文店名翻譯",
  "date": "YYYY-MM-DD 格式的日期，如果看不到日期就回傳空字串",
  "items": [
    {
      "name_ja": "日文品名原文",
      "name": "繁體中文品名翻譯",
      "quantity": 數量(數字),
      "unit_price": 單價(數字，日幣),
      "tax_rate": 稅率(數字，例如 0.08 代表 8%),
      "tax_type": "稅別說明，例如 reduced(輕減稅率8%) 或 standard(標準稅率10%)"
    }
  ],
  "total": 總金額(數字，日幣),
  "payment_method": "推測的支付方式：cash/credit_card/paypay/suica/other"
}

注意事項：
- 日本消費稅分為 8%（食品類輕減稅率）和 10%（一般稅率），請根據收據上的標記判斷
- 金額只取數字，不要包含逗號或日幣符號
- 如果收據上有「※」或「＊」標記通常代表 8% 輕減稅率
- 請確保 JSON 格式正確，只回傳 JSON，不要加任何其他文字`;

export async function recognizeReceipt(
  imageBase64: string,
  mimeType: string
): Promise<OCRResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    RECEIPT_PROMPT,
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("無法解析 AI 回應");
  }

  return JSON.parse(jsonMatch[0]) as OCRResult;
}
