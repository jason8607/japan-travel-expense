# 旅帳 Editorial Design System

日本雜誌排版美學的設計系統，套用於 `design/editorial-v2` 分支。靈感來自 Travelio 原型（雜誌風 / 書籍裝幀）。

UI 文字使用繁體中文，CSS class 與變數使用 kebab-case 英文。

> **實作細節（class 名稱、樣式）以 `app/(main)/editorial.css` 為準。**本檔只記設計原則與 token 表，新元件請先讀 source。

---

## 設計哲學

- **編輯排版**：大標題 + 編號條目 + 細密刊頭，像翻雜誌目錄
- **明體字優先**：標題與金額用襯線（Shippori Mincho / Noto Serif TC），輔以 monospace 標籤（JetBrains Mono）形成節奏對比
- **米色 + 朱紅**：暖米紙底色 + 日式朱紅做唯一強調色，沒有第二個彩度高的顏色
- **空間勝於密度**：留白比資訊密度優先（缺點：高頻操作偏慢，已知取捨）
- **裝飾即資訊**：垂直直書、編號 01–07、刊頭 N°XX、刊期日期都是裝飾也是真實資料

---

## 顏色 Token

定義在 `app/(main)/editorial.css` 的 `:root`，用 `--ed-` 前綴避免與 globals.css 的 shadcn token 衝突。

| Token | 值 | 用途 |
| --- | --- | --- |
| `--ed-paper` | `#FBF7EE` | 主背景（米色紙） |
| `--ed-paper-deep` | `#EFE8D4` | 次背景（深米，guest banner） |
| `--ed-cream` | `#F4EFE6` | 半透明 chip / avatar 底 |
| `--ed-ink` | `#1A1815` | 主要文字、強調背景（金額卡） |
| `--ed-ink-soft` | `#4A463E` | 次要文字、註解 |
| `--ed-muted` | `#8A8376` | 靜音文字、kicker、編號 |
| `--ed-line` | `#D9D1C0` | 分隔線 / dashed border |
| `--ed-vermillion` | `#B83A26` | 朱紅（FAB、active state、強調數字、刪除按鈕） |
| `--ed-vermillion-soft` | `#E3B9AE` | 朱紅淺色（金額卡的 ¥ 符號、currency 按鈕） |
| `--ed-receipt` | `#F7F2E6` | 收據背景（OCR 區） |
| `--ed-accent` | `#C8371D` | 較強的朱紅備用（OCR 框、進度條） |

⚠️ **Token 範圍**：定義在 `:root`，這樣 portal 渲染的元件（如 Sheet）也能解析。`.editorial-app` wrapper 只負責設背景與字體，**不要**把 token 移回 wrapper scope。

---

## 字體 Token

四套 Google Fonts，透過 `next/font/google` 在 `app/layout.tsx` 全域載入。

| CSS 變數 | 字體 | 用途 |
| --- | --- | --- |
| `--font-shippori` | Shippori Mincho（400/600/700/800） | 雜誌大標、金額、按鈕、catalog 編號 |
| `--font-noto-serif-tc` | Noto Serif TC（400/500/600/700/900） | 中文襯線備援、內文 |
| `--font-jetbrains` | JetBrains Mono（400–700） | kicker、刊頭日期、單位、按鈕英數 |
| `--font-inter` | Inter | bottom nav 標籤、StatusBar |

**Utility class**：`.ed-serif`、`.ed-mono`、`.ed-sans` 切換字體族系。

---

## 排版規範

- **頁面 padding**：水平 24px（內容區），FAB 右 20、下 20
- **頁面捲動 padding-bottom**：96–110px（讓底部 nav + FAB 不蓋住內容）
- **段落間距**：22–26px（區塊與區塊之間）
- **kicker 字距**：mono 風格 2px，serif 風格 6px
- **行高**：標題 0.9–1，內文 1.6–1.7，襯線斜體用於註解
- **小字可讀性**：≤11px 的中文要避免襯線體（Shippori 在小字偏吃力，改 mono 或 sans）

---

## 元件目錄

完整 class 與標記在 `app/(main)/editorial.css`，這裡只記每個元件**用在哪、解決什麼問題**：

| 元件 | 用途 | 主要 class |
| --- | --- | --- |
| Editorial Header（刊頭） | HomePage 頂部刊期+日期 | `.ed-runhdr` `.ed-rule` `.ed-rule2` |
| PageTitle（雜誌大標） | Records、Records/new 標題 | `.ed-page-title-*` |
| Mega Number（巨型金額） | 旅程總支出、Detail sheet、AmountCard | `.ed-mega` |
| Vertical Type（直書） | 城市標 / 輔助 kicker | `.ed-vert` |
| Numbered Row（編號條目） | HomePage Top 3（大）/ Records 列表（小） | `.ed-row` `.ed-row-*` |
| View Tabs | Records 4 個分組視角 | `.ed-view-tabs` `.ed-view-tab` |
| Search Bar + Filter | Records 列表搜尋 / 篩選 | `.ed-search-bar` `.ed-filter-toggle` `.ed-filter-panel` |
| Group Header | Records 分組標題列 | `.ed-group-head` |
| Chips | 付款方式、分帳多選 | `.ed-chip` |
| Cats Grid | Records/new 分類選擇 | `.ed-cats` `.ed-cat` |
| Amount Card | Records/new 金額輸入（黑底） | `.ed-amount-display` `.ed-amount-big` |
| FAB | HomePage / Records 新增 | `.ed-fab` |
| Bottom Sheet | 點 row 後明細 | `<ExpenseDetailSheet>` |
| Bottom Nav | 全域底部導航 | `<BottomNav data-style="editorial">` |
| Member Card | Records 按成員 view | `.ed-member-card` |
| Settle View | Records 結算 view | 含總花費卡 / 最小轉帳 / 品項歸屬，資料來自 `lib/settlement.ts` |
| Scan Frame | /scan 黑底相機框 | `.ed-scan-frame` `.ed-scan-corner` `.ed-scan-empty-h` |
| Scan Receipt | 辨識中收據卡片 | `.ed-scan-receipt`（rotate -1.2°） `.ed-scan-laser` `.ed-scan-status` |
| Scan Confirm Item | OCR 確認逐品項 | `.ed-item` `.ed-item-num` `.ed-item-name` `.ed-chip-sm` |

按鈕：`.ed-btn-primary`（朱紅實心）、`.ed-btn-ghost`（透明黑邊）、`.ed-input-line`（單行 input 黑底線）

---

## 套用狀態

✅ 已套用：
- `app/(main)/page.tsx` — HomePage
- `app/(main)/records/page.tsx` — 4 view tabs（按日期 / 按類別 / 按成員 / 結算）
- `app/(main)/records/new/page.tsx` — 含信用卡、備註、日期
- `app/(main)/scan/page.tsx` + `components/scan/*` — 黑底相機框 / 雷射 sweep / 收據旋轉 -1.2°
- `components/expense/expense-detail-sheet.tsx`

❌ 尚未套用（仍是舊 shadcn 風格）：
- `app/(main)/stats/`
- `app/(main)/settings/`
- `app/(main)/summary/`
- `app/(main)/recap/`
- `app/(main)/trip/`

---

## 開發指引

### 新增 editorial 頁面

1. 確認頁面在 `app/(main)/` 下，會自動繼承 `.editorial-app` wrapper（`(main)/layout.tsx`）
2. 字體已透過 root layout 全域載入，直接用 `.ed-serif` / `.ed-mono` class
3. 用 `var(--ed-paper)` 等 token，不要 hardcode
4. utility class 不夠用時加到 `app/(main)/editorial.css`，不要混到 `globals.css`

### 新增需要 portal 的元件（Dialog / Sheet / DropdownMenu）

⚠️ token 必須透過 `:root` 取得（已是這樣）。**不要**把 `--ed-*` 移回 `.editorial-app` scope，否則 portal 內元件解不到。

### 與既有 shadcn 元件混用

`.editorial-app` 只設定 background / color / font，不影響 shadcn styling。建議 editorial 頁面避免直接用 shadcn UI（除了 Sheet 這類純結構性元件），改寫 inline editorial markup。

---

## 已知限制 / 取捨

1. **明體中文小字可讀性**：≤11px 切回 sans / mono
2. **紅色語意衝突**：FAB（新增）和刪除按鈕都用 `--ed-vermillion`，靠位置 + confirm dialog 區分
3. **資訊密度**：每屏顯示筆數比舊設計少 30–40%（首頁從 5 筆變 3 筆）
4. **Webfont 載入**：4 個 Google Fonts 全載 FOUT 明顯，production 前須 subset + self-host
5. **無 dark mode**：editorial 目前只有 light theme
6. **PWA install prompt / Toast**：仍是 shadcn 風格，何時 restyle 未定
