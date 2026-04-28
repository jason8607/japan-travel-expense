# 旅帳 Editorial Design System

日本雜誌排版美學的設計系統，套用於 `design/editorial-v2` 分支。靈感來自 Travelio 原型（雜誌風 / 書籍裝幀）。

UI 文字使用繁體中文，CSS class 與變數使用 kebab-case 英文。

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

⚠️ **Token 範圍**：定義在 `:root`，這樣 portal 渲染的元件（如 Sheet）也能解析。`.editorial-app` wrapper 只負責設背景與字體，不再持有 token。

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

⚠️ 性能：4 個 webfont 全域載入，首次載入 FOUT 明顯。若要 production 可考慮 subset 與 swap 策略。

---

## 元件模式

### 1. Editorial Header（刊頭）

```
TRAVELIO — N°07              2026.04.12
─────────────────────────────────────
═════════════════════════════════════
```

- `.ed-runhdr` — flex 兩端對齊，左邊 issue 號（依旅程經過天數動態產生），右邊日期
- `.ed-rule` — 1px 細線
- `.ed-rule2` — 4px 粗線（雜誌「條紋封面」）

**用於**：HomePage 頂部

---

### 2. PageTitle（雜誌大標）

```
全 部 記 錄
記帳本。
```

- `.ed-page-title-kicker` — kicker 行（明體 13px、字距 6px）
- `.ed-page-title-h` — H1（明體 40px、line-height 1）
- `.ed-page-title-dot` — 末尾朱紅句點

**用於**：Records、Records/new

---

### 3. Mega Number（巨型金額）

```
¥184,520        ← 朱紅
```

- `.ed-mega` — 明體 50–66px、letter-spacing -2、line-height 0.9
- 千分號逗號用 `<span style="color: var(--ed-vermillion)">,</span>` 強調

**用於**：HomePage 旅程總支出、Detail sheet 金額、AmountCard

---

### 4. Vertical Type（直書）

- `.ed-vert` — `writing-mode: vertical-rl` + `text-orientation: upright`
- 用於旅程城市標（京都．東京．七日）、輔助 kicker

---

### 5. Numbered Expense Row（編號條目）

```
01   一蘭拉麵            ¥2,480
     餐飲 · 澀谷店         04/12
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
```

- `.ed-row` — flex baseline 對齊，dashed bottom border
- `.ed-row-num` — 朱紅明體 22px，width 32（兩位數編號 01–99）
- `.ed-row-tt` / `.ed-row-sub` — 標題 / 分類·店家
- `.ed-row-amt` / `.ed-row-dt` — 金額 / 日期

**用於**：HomePage 最近消費、Records 列表

---

### 6. Day Tabs

```
全部  Day 1  Day 2  [Day 3]  Day 4  Day 5
```

- `.ed-day-tabs` — 水平捲動，無 scrollbar
- `.ed-day-tab` — JetBrains Mono 11px，active 加朱紅底線

**用於**：Records 列表

---

### 7. Chips（單行多選按鈕）

```
[現金]  信用卡  PayPay  Suica
```

- `.ed-chip` — 明體 13px、薄邊框
- `.ed-chip.on` — 黑底白字（`var(--ed-ink)`）

**用於**：Records/new 付款方式、分帳

---

### 8. Cats Grid（5 欄分類網格）

```
[🍜 餐飲]  🚄 交通  🛍️ 購物  🏨 住宿  🎫 門票
```

- `.ed-cats` — `grid-template-columns: repeat(5, 1fr)`、aspect-ratio 1
- `.ed-cat` / `.ed-cat.on` — active 朱紅底白字
- 配 `.ed-cat-ic` (20px emoji) + `.ed-cat-lb` (11px label)

**用於**：Records/new 分類選擇

---

### 9. Amount Card（黑色金額卡）

```
┌─ 金額 ─────────────── [JPY] [TWD] ─┐
│  ¥ 2,480                              │
│  ≈ NT$ 528                            │
└──────────────────────────────────────┘
```

- `.ed-amount-display` — 黑底（`var(--ed-ink)`）米色字
- `.ed-amount-big` — 明體 56px input
- 右上幣別切換 chip：JPY / TWD（`var(--ed-vermillion-soft)` 邊框）

**用於**：Records/new 金額輸入

---

### 10. FAB

- `.ed-fab` — 58×58 朱紅圓鈕，明體 ＋ 30px
- 位置：`absolute right:20 bottom:20`、`z-index:15`

**用於**：HomePage、Records 列表

---

### 11. Bottom Sheet（明細視窗）

點任一筆 row → 從底部滑出半屏明細。

- 元件：`<ExpenseDetailSheet>`（`components/expense/expense-detail-sheet.tsx`）
- 底層：shadcn `Sheet` (`@base-ui/react/dialog`) `side="bottom"` + portal 渲染到 body
- 桌機約束：CSS `[data-slot=sheet-content][data-side=bottom].ed-detail-sheet { max-width:32rem; margin-inline:auto }` 讓它跟 root layout 的 `max-w-lg` shell 對齊

**內容**：kicker 分類·標題 + ✕ 關閉 / 大金額 / 2×2 細節（付款 / 店家 / 日期 / 分帳）/ 備註（選填）/ 編輯 + 刪除按鈕

---

### 12. Bottom Nav（底部導航）

`<BottomNav>` 加 `data-style="editorial"` attribute，editorial.css 用 attribute selector 套用：

- 字體切 Inter，字距 2px
- Active 狀態：朱紅文字 + 朱紅底線

---

## 按鈕 Token

- `.ed-btn-primary` — 朱紅底米色字、字距 7px、無圓角（雜誌按鈕風）
- `.ed-btn-ghost` — 透明底黑字、1.5px 黑邊
- `.ed-input-line` — 透明底、1.5px 黑下底線（單行 input）

---

## 排版規範

- **頁面 padding**：水平 24px（內容區），FAB 右 20、下 20
- **頁面捲動 padding-bottom**：96–110px（讓底部 nav + FAB 不蓋住內容）
- **段落間距**：22–26px（區塊與區塊之間）
- **kicker 字距**：2–6px（mono 風格 2，serif 風格 6）
- **行高**：標題 0.9–1，內文 1.6–1.7，襯線斜體用於註解

---

## 已套用編輯風格的頁面

- ✅ `app/(main)/page.tsx` — HomePage（首頁 dashboard）
- ✅ `app/(main)/records/page.tsx` — 記帳列表
- ✅ `app/(main)/records/new/page.tsx` — 新增 / 編輯消費（簡化版表單）
- ✅ `components/expense/expense-detail-sheet.tsx` — 點擊 row 後的明細視窗

## 尚未套用（仍是舊 shadcn 風格）

- ❌ `app/(main)/scan/` — OCR 掃描
- ❌ `app/(main)/stats/` — 統計
- ❌ `app/(main)/settings/` — 設定
- ❌ `app/(main)/summary/` — 報表
- ❌ `app/(main)/recap/` — 旅後回顧
- ❌ `app/(main)/trip/` — 旅程設定 / 加入

---

## 開發指引

### 新增 editorial 頁面

1. 確認頁面落在 `app/(main)/` 下，這樣會自動繼承 `.editorial-app` wrapper（在 `(main)/layout.tsx`）
2. 字體已透過 root layout 全域載入，直接用 `.ed-serif` / `.ed-mono` class
3. Token 用 `var(--ed-paper)` 等而非 hardcode
4. 既有 utility class 不夠用時加到 `app/(main)/editorial.css`，不要混到 globals.css

### 新增需要 portal 的元件（Dialog / Sheet / DropdownMenu）

⚠️ 必須確保 token 透過 `:root` 取得（已經是這樣）。**不要**把 `--ed-*` 移回 `.editorial-app` scope，否則 portal 內元件會解不到。

### 與既有 shadcn 元件混用

`.editorial-app` 只設定 background / color / font，不影響 shadcn 元件 styling。混用沒問題，但視覺風格會打架。建議：editorial 頁面避免直接用 shadcn UI（除了 Sheet 這類純結構性元件），改寫 inline editorial markup。

---

## 已知限制 / 取捨

1. **明體中文小字可讀性**：≤11px 的 sub label 在襯線體下偏吃力。考慮：低於 12px 時切回 sans
2. **紅色語意衝突**：FAB（新增）和刪除按鈕都用 `--ed-vermillion`，需依靠位置（右下 vs sheet 底）和 confirm dialog 區分
3. **資訊密度**：每屏顯示筆數比舊設計少 30–40%（首頁從 5 筆變 3 筆）
4. **Webfont 載入**：4 個 Google Fonts 全載，FOUT 明顯。Production 可考慮 self-host + subset
5. **無 dark mode**：editorial 風格目前只有 light theme，全套米色＋朱紅在 dark mode 下需重做
