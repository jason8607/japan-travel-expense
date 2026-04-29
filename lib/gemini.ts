import type { OCRResult } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isOCRPaymentCode } from "@/lib/payment-methods";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

function normalizeFullWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
}

function normalizeYenAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  let normalized = value
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/[¥￥円,\s]/g, "")
    .trim();

  // OCR/AI sometimes turns a thousands separator into a decimal point for yen.
  if (/^\d+\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace(".", "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeQuantity(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseFloat(normalizeFullWidthDigits(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeTaxRate(value: unknown, taxType: unknown): 0.08 | 0.1 {
  const isCloseTo = (actual: number, expected: number) => Math.abs(actual - expected) < 1e-6;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (isCloseTo(value, 8) || isCloseTo(value, 0.08)) return 0.08;
    if (isCloseTo(value, 10) || isCloseTo(value, 0.1)) return 0.1;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(normalizeFullWidthDigits(value).replace("%", "").trim());
    if (isCloseTo(parsed, 8) || isCloseTo(parsed, 0.08)) return 0.08;
    if (isCloseTo(parsed, 10) || isCloseTo(parsed, 0.1)) return 0.1;
  }

  return taxType === "reduced" ? 0.08 : 0.1;
}

function normalizePaymentMethod(value: unknown): OCRResult["payment_method"] {
  return isOCRPaymentCode(value) ? value : "cash";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const RECEIPT_PROMPT = `你是一個日本收據辨識專家，目標讀者是台灣旅客。請分析這張圖片，擷取資訊並翻譯成自然的繁體中文。

## 第一步：判斷是否為收據（最重要）

先判斷這張圖片是否為「實際的消費收據、發票、帳單」。如果不是（例如：人物自拍、風景照、食物照、螢幕截圖、純文字文件、空白圖、名片、其他非收據文件），請只回傳：

{ "is_receipt": false }

只有確定圖片內容是消費收據時，才進行下方的翻譯與欄位擷取，並將 "is_receipt" 設為 true。

## 翻譯規則（非常重要）

1. **品名翻譯** — 翻成台灣人容易理解的說法，不要直譯日文漢字：
   - 食品：おにぎり→飯糰、サンドイッチ→三明治、弁当→便當、唐揚げ→炸雞、たこ焼き→章魚燒、うどん→烏龍麵、そば→蕎麥麵、ラーメン→拉麵、カレー→咖哩、天ぷら→天婦羅、餃子→煎餃、丼→丼飯
   - 飲料：お茶→茶、緑茶→綠茶、麦茶→麥茶、コーヒー→咖啡、ミルク→牛奶、ジュース→果汁、ビール→啤酒、チューハイ→調酒、水→水
   - 甜點：アイス→冰淇淋、ケーキ→蛋糕、プリン→布丁、チョコ→巧克力、クッキー→餅乾、大福→大福、団子→糰子、メロンパン→哈密瓜麵包、クロワッサン→可頌
   - 日用品：歯ブラシ→牙刷、シャンプー→洗髮精、目薬→眼藥水、マスク→口罩、ティッシュ→面紙、ばんそうこう→OK繃
   - 美妝：日焼け止め→防曬乳、化粧水→化妝水、乳液→乳液、リップ→唇膏、ファンデーション→粉底、アイシャドウ→眼影、マスカラ→睫毛膏、クレンジング→卸妝、パック→面膜、美容液→精華液
   - 衣服：Tシャツ→T恤、パンツ→褲子、スカート→裙子、ジャケット→外套、ワンピース→洋裝、靴下→襪子、下着→內衣、帽子→帽子、マフラー→圍巾、手袋→手套
2. **品牌名** — 保留原文不翻譯，可在後面加品項說明：
   - 例：「伊右衛門」→「伊右衛門 綠茶」、「じゃがりこ」→「Jagarico 薯條杯」、「ポカリスエット」→「寶礦力水得」（台灣已有通用譯名的用通用譯名）
3. **店名翻譯** — 知名連鎖店用台灣通用譯名，其餘直譯或音譯：
   - 例：セブンイレブン→7-ELEVEN、ファミリーマート→全家、ローソン→LAWSON、ドン・キホーテ→唐吉訶德、マツモトキヨシ→松本清、ダイソー→大創、ユニクロ→UNIQLO、スターバックス→星巴克
4. **收據縮寫** — 日本收據常省略品名，盡量還原完整意思：
   - 例：「ﾊﾐﾒﾛﾝﾊﾟﾝ」→「哈密瓜麵包」、「ｵﾆｷﾞﾘ ｼｬｹ」→「鮭魚飯糰」、「PB 食ﾊﾟﾝ」→「自有品牌吐司」

## 回傳格式（JSON）

{
  "is_receipt": true,
  "store_name_ja": "日文店名原文",
  "store_name": "繁體中文店名（依上述規則翻譯）",
  "date": "YYYY-MM-DD，看不到日期回傳空字串",
  "items": [
    {
      "name_ja": "日文品名原文（含收據上的縮寫原文）",
      "name": "繁體中文品名（依上述規則翻譯，讓台灣人一看就懂）",
      "quantity": 數量,
      "unit_price": 單價日幣,
      "tax_rate": 稅率如0.08,
      "tax_type": "reduced 或 standard"
    }
  ],
  "total": 總金額日幣,
  "payment_method": "cash/credit_card/paypay/suica/other"
}

## 注意事項
- 日本消費稅：8%（食品類輕減稅率）和 10%（一般稅率），收據上「※」或「＊」標記通常代表 8%
- 金額只取數字，不含逗號或日幣符號
- 只回傳 JSON，不要加任何其他文字或 markdown 標記`;

export async function recognizeReceipt(
  imageBase64: string,
  mimeType: string
): Promise<OCRResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

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
  if (process.env.NODE_ENV !== "production") {
    console.log("Gemini response length:", text.length);
  }

  let jsonStr = text;
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1];
  }

  let depth = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < jsonStr.length; i++) {
    if (jsonStr[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (jsonStr[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (start === -1 || end === -1) {
    console.error("Gemini: no JSON found in response");
    throw new Error("無法解析 AI 回應");
  }

  const jsonBlock = jsonStr.slice(start, end + 1);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonBlock);
  } catch (parseErr) {
    console.error("Gemini JSON parse error:", parseErr instanceof Error ? parseErr.message : parseErr);
    if (process.env.NODE_ENV !== "production") {
      console.error("Extracted JSON snippet:", jsonBlock.slice(0, 500));
    }
    throw new Error("AI 回應格式不符");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("AI 回應格式不符");
  }

  if (parsed.is_receipt === false) {
    return {
      is_receipt: false,
      store_name: "",
      store_name_ja: "",
      date: "",
      items: [],
      total: 0,
      payment_method: "cash",
    };
  }

  if (parsed.is_receipt !== true) {
    console.error("Gemini: missing is_receipt flag, keys:", Object.keys(parsed));
    throw new Error("AI 回應格式不符");
  }

  if (
    !Array.isArray(parsed.items) ||
    typeof parsed.store_name !== "string"
  ) {
    console.error("Gemini: unexpected structure, keys:", Object.keys(parsed));
    throw new Error("AI 回應格式不符");
  }

  const validatedItems = parsed.items.map((item, i) => {
    const itemRecord = isRecord(item) ? item : {};
    const rawTaxType = itemRecord.tax_type === "reduced" ? "reduced" : itemRecord.tax_type;
    const taxRate = normalizeTaxRate(itemRecord.tax_rate, rawTaxType);
    const taxType = rawTaxType === "reduced" || taxRate === 0.08 ? "reduced" as const : "standard" as const;

    return {
      name: typeof itemRecord.name === "string" ? itemRecord.name : `品項 ${i + 1}`,
      name_ja: typeof itemRecord.name_ja === "string" ? itemRecord.name_ja : "",
      quantity: normalizeQuantity(itemRecord.quantity),
      unit_price: normalizeYenAmount(itemRecord.unit_price),
      tax_rate: taxRate,
      tax_type: taxType,
    };
  });

  return {
    is_receipt: true,
    store_name: parsed.store_name as string,
    store_name_ja: typeof parsed.store_name_ja === "string" ? parsed.store_name_ja : "",
    date: typeof parsed.date === "string" ? parsed.date : "",
    items: validatedItems,
    total: normalizeYenAmount(parsed.total),
    payment_method: normalizePaymentMethod(parsed.payment_method),
  };
}
