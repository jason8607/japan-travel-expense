---
name: 旅帳 — 日本旅遊記帳
description: A private, two-themed pocket ledger for travel expenses — calm signal blue, slate ink, ring-bordered surfaces.
colors:
  background: "#FFFFFF"
  foreground: "#0F172A"
  card: "#FFFFFF"
  popover: "#FFFFFF"
  primary: "#2563EB"
  primary-foreground: "#FFFFFF"
  secondary: "#F1F5F9"
  secondary-foreground: "#0F172A"
  muted: "#F1F5F9"
  muted-foreground: "#64748B"
  accent: "#DBEAFE"
  accent-foreground: "#1E40AF"
  border: "#E2E8F0"
  input: "#E2E8F0"
  ring: "#2563EB"
  destructive: "oklch(0.577 0.245 27.325)"
  warning: "oklch(0.769 0.188 70.08)"
  warning-foreground: "oklch(0.448 0.119 61.907)"
  warning-subtle: "oklch(0.971 0.048 90.0)"
  success: "oklch(0.723 0.219 149.579)"
  success-foreground: "oklch(0.432 0.095 166.913)"
  success-subtle: "oklch(0.962 0.044 156.743)"
  chart-1: "#2563EB"
  chart-2: "oklch(0.72 0.14 220)"
  chart-3: "oklch(0.65 0.13 150)"
  chart-4: "oklch(0.70 0.15 340)"
  chart-5: "oklch(0.65 0.13 40)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
  4xl: "26px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  badge-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
---

# Design System: 旅帳

## 1. Overview

**Creative North Star: "The Pocket Ledger"**

旅帳 是一個 PWA 口袋帳本,給作者本人和少數熟人在日本旅行時用。它不是社交產品、不是觀光紀念,也不是給陌生人看的儀表板。視覺系統圍繞「**精準的私人工具**」這個核心:單手可操作的窄欄手機畫面、白底襯穩重的板岩字、唯一一個訊號藍主色用來標示動作,其餘一律灰階。

界面的密度由功能驅動 — Records 頁是緊湊的列表、Stats 頁是清晰可掃讀的圖表、Scan 頁是無干擾的拍照流程。每一個元件都有它存在的功能理由,沒有純裝飾的元素。系統明確拒絕花俏記帳 App 的彩色 emoji、典型 SaaS dashboard 的大數字漸層 hero、過度設計的旅遊 App 風景照背景,以及任何 glassmorphism、gradient text、bounce 動畫。

**Key Characteristics:**
- 手機優先的 `max-w-lg` (32rem) 中央欄位,單手可達的底部固定導覽
- 白 + 板岩字 + 訊號藍主色,藍色僅出現在主要動作與焦點環
- 全平面元件 — 用 `ring-1` 細描邊取代 box-shadow,depth 由顏色深淺與分隔線傳達
- Geist 單一無襯線字體系統,無 mono 對比,無 display serif 對比
- 圓角適中(10–14px),不極端 0,也不極端 999

## 2. Colors

整套色板克制,用「板岩 + 藍 + 白」三點支撐,所有中性色都偏冷灰(slate hue)以對齊主色 hue。

### Primary
- **Signal Blue** (`#2563EB`): 唯一的品牌動作色。用於 primary button、focus ring、進度條、`chart-1`、選中態 indicator、可點連結。**禁止**用作大面積背景或裝飾。

### Neutral
- **Page White** (`#FFFFFF`): App 主背景與 card 背景。清空的紙面感,不是亮白冷光感。
- **Ink Slate** (`#0F172A`): 主文字色,所有 heading / body / 重要數字。沒有用 `#000`,微帶冷藍 hue 與品牌主色呼應。
- **Smoke** (`#64748B`): 次要文字、metadata、placeholder、icon-only 按鈕。
- **Mist** (`#F1F5F9`): secondary 按鈕背景、muted 區塊背景、tag 底色。極淺,接近紙面的紋理感。
- **Hairline** (`#E2E8F0`): 邊框、分隔線、input 邊。比 Mist 略深一階,作為 1px ring 的顏色基礎。

### Accent (sparing)
- **Soft Sky** (`#DBEAFE`): hover / 選中態的微弱底色,以及小型 highlight chip 背景。
- **Deep Indigo** (`#1E40AF`): Soft Sky 上的對比文字色。

### Semantic State
- **Warning** (`oklch(0.769 0.188 70.08)`): 預算接近超支、OCR 用量逼近上限。`warning-subtle` 用於背景, `warning-foreground` 用於文字,確保 WCAG AA。
- **Success** (`oklch(0.723 0.219 149.579)`): 結算完成、登入成功。同樣有 subtle / foreground 兩階。
- **Destructive** (`oklch(0.577 0.245 27.325)`): 刪除消費、移除成員。**僅**用於危險動作的標示與錯誤狀態。

### Chart Palette
- `chart-1`(`#2563EB`)為品牌色,其餘 `chart-2..5` 為協調色相(220 / 150 / 340 / 40),用 OKLCH 維持感知亮度一致。

### Named Rules

**The One Action Color Rule.** 整個 App 在任何畫面上,**Signal Blue 的覆蓋面積不得超過 10%**。它的稀有性就是它的意義。如果一個畫面上有兩個藍色按鈕,改一個為 outline 或 ghost。

**The No-True-Black Rule.** 永遠不用 `#000` 或 `#FFF`。`Ink Slate` (`#0F172A`) 帶 220 hue,跟 Signal Blue 同色族,文字看起來才不會像螢光筆寫在紙上。

**Themes Are Optional.** 系統內建 light(canonical)/ dark / japanese 三主題,但 PRODUCT.md 的視覺基準是 light。新元件先確保 light 完整,dark 用 `dark:` variant 處理,japanese 主題只在使用者主動切換時才需要保證可讀性。

## 3. Typography

**Display Font:** Geist (next/font/google,ui-sans-serif fallback)
**Body Font:** Geist (同上)
**Label/Mono Font:** 無獨立 mono — 系統故意不使用 monospace 對比

**Character:** 單一 Geist 無襯線承載所有層級,靠 weight 與 size 拉開,而非 family 對比。Geist 的字寬與字距偏窄,在窄欄手機畫面 (`max-w-lg`) 下密度合適,日文 / 中文混排不會打架。

### Hierarchy
- **Display** (600, 1.5rem / 24px, lh 1.2): 旅程總計、結算總額、日期標題等需要被一眼抓到的大數字。
- **Headline** (600, 1.125rem / 18px, lh 1.3): 頁面標題(`Records`、`今日花費`)、card title。
- **Title** (500, 1rem / 16px, lh 1.4): 列表項主文字、表單欄位標題、按鈕內文。
- **Body** (400, 0.875rem / 14px, lh 1.5): 內文、說明、表單描述。長文字段限制 65–75ch。
- **Label** (500, 0.75rem / 12px, lh 1.3, letter-spacing 0.01em): metadata、時間戳、tag 文字、icon 旁註。

### Named Rules

**The Single Family Rule.** 全站只用 Geist。**禁止**為了「設計感」引入 serif display 或 monospace。對比靠 weight (400 / 500 / 600) 與 size (12 → 24 px),不靠 family。

**The Tabular Numbers Rule.** 所有金額顯示必須開啟 `font-variant-numeric: tabular-nums`,小數點對齊。在 list view 上對齊比好看更重要。

## 4. Elevation

**Flat by default.** 系統主動避免 box-shadow 作為深度語言。Card 用 `ring-1 ring-foreground/10` (1px 內描邊,10% 不透明的 Ink Slate)取代 shadow;唯一的全域 shadow 是 `<main>` 容器的 `shadow-sm`,因為它代表手機外殼/手機畫面的隱喻。

深度透過三種方式而非陰影傳達:
1. **顏色階層** — `background` < `card` < `popover`,light theme 中三者都接近白,差異靠 ring 表達
2. **層位差異** — 列表項 hover 時 background 微暗、focus 時加 ring,而非「升起」
3. **狀態描邊** — focus ring 用 `ring-3 ring-ring/50`(3px 50% 主色),活躍狀態用 `active:translate-y-px`(向下 1px 模擬按下)

### Shadow Vocabulary

- **App Shell** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): 唯一允許的 shadow,只用於 `<main>` 中央欄外殼,模擬手機畫面浮在頁面上。
- **Focus Ring**(非 shadow,用 `box-shadow: 0 0 0 3px var(--ring) / 0.5`)用於鍵盤聚焦的所有可互動元件。

### Named Rules

**The Ring-Not-Shadow Rule.** Card / Dialog / Popover 的「邊」必須是 `ring-1 ring-foreground/10`,不准用 `shadow-md`、`shadow-lg`,更不能 `shadow-xl`。陰影只屬於 App Shell 與 focus ring 兩個位置。

**The Active Press Rule.** 可點元件按下時用 `active:translate-y-px`(向下移 1px),不用 scale、不用 shadow。回饋要極小、極快、極實。

## 5. Components

### Buttons

實作位於 `components/ui/button.tsx`,基於 `@base-ui/react`。

- **Shape:** 圓角 `rounded-lg` (10px),sm/icon-sm 變體用 `min(--radius-md, 12px)`(8px → 12px clamp)。
- **Primary** (`variant="default"`): 訊號藍底 + 白字,`bg-primary text-primary-foreground`。hover 時(僅 `<a>`)變 `bg-primary/80`。high-attention 動作用,例如「儲存」、「掃描收據」。
- **Outline** (`variant="outline"`): 透明底 + 邊 + 板岩字。hover 時切換到 `bg-muted`。中性動作用。
- **Secondary** (`variant="secondary"`): Mist 底 + 板岩字。hover 為 `bg-secondary/80`。同一畫面有多個動作時的次要動作。
- **Ghost** (`variant="ghost"`): 完全無底 + 板岩字。hover 進 Mist 底。toolbar / icon-button 用。
- **Destructive** (`variant="destructive"`): 紅 10% 底 + 紅字 (`bg-destructive/10 text-destructive`),刻意不滿底紅。刪除確認、移除成員。
- **Sizes:** `xs` (h-6) / `sm` (h-7) / `default` (h-8) / `lg` (h-9),配對 icon-only 變體。預設高度 32px,適合單手點擊但不浪費窄欄空間。
- **Active state:** `active:translate-y-px`(全 variant 共用)。
- **Focus:** `focus-visible:ring-3 focus-visible:ring-ring/50` + `focus-visible:border-ring`。

### Cards

實作位於 `components/ui/card.tsx`。

- **Corner Style:** `rounded-xl` (14px)。
- **Background:** `bg-card`(light = `#FFFFFF`)。
- **Shadow Strategy:** **無 shadow** — 只用 `ring-1 ring-foreground/10`(0.5px Ink Slate at 10%)。參見 Ring-Not-Shadow Rule。
- **Internal Padding:** 預設 `py-4 px-4`(16px),`size="sm"` 變體 `py-3 px-3`(12px)用於密集列表。
- **Footer:** 有 footer 時 footer 帶上 `border-t bg-muted/50`,作為視覺分區,不增加陰影。
- **Image:** card 第一個 / 最後一個 child 是 `<img>` 時自動套圓角頂/底,padding 自動歸零。

### Inputs

實作位於 `components/ui/input.tsx`,基於 `@base-ui/react`。

- **Style:** `h-8`(32px),`rounded-lg` (10px),`border-input bg-transparent`,`px-2.5 py-1`。
- **Focus:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`(訊號藍 50% 3px 環)。
- **Disabled:** `disabled:opacity-50 disabled:bg-input/50 disabled:pointer-events-none`。
- **Error:** `aria-invalid="true"` 時切換到 `border-destructive` + `ring-3 ring-destructive/20`。

### Navigation

底部固定導覽列,實作於 `components/layout/`(預期)。

- **Layout:** `nav.fixed.bottom-0`,通寬。`@supports (padding-bottom: env(safe-area-inset-bottom))` 自動加 iPhone home-indicator 內距。
- **Tabs:** Records / Scan(中央 prominence)/ Stats / Settings 等。
- **Selected state:** 圖示 + 文字切換到 `text-primary`,不加底色不加底線。
- **Single-thumb reach:** 主要動作落在底部 50% 範圍。

### Badges

實作位於 `components/ui/badge.tsx`。

- **Style:** `rounded-md` (8px),`px-2 py-0.5`(8px / 2px),text-xs label 字級。
- **Default:** `bg-accent text-accent-foreground`(Soft Sky + Deep Indigo)。
- **Variant 用法:** category tag、payment method、信用卡名稱簡標。

### Dialog / Sheet

基於 `@base-ui/react` dialog primitive(實作 `components/ui/dialog.tsx`、`components/ui/sheet.tsx`)。

- **Background:** `bg-popover`,`ring-1 ring-foreground/10`,`rounded-xl`。
- **Overlay:** `bg-black/40` 半透黑遮罩(non-blur,**禁止**加 `backdrop-blur`)。
- **Sheet** 從底部 slide-up 呈現,主要用於收據確認、新增消費、結算。

### Scanner Sweep (signature)

OCR 拍照頁的雷射掃描動畫,實作於 globals.css `@keyframes scanSweep`。

- 1 條訊號藍 1px 線,從 -100% 到 100% Y 軸位移,2.4s 線性循環。
- `prefers-reduced-motion: reduce` 環境下動畫降為 0.01ms(整套 App 通則)。
- 是整個系統允許的「炫技」例外 — 因為它真實對應掃描行為。

## 6. Do's and Don'ts

### Do:
- **Do** 把 Signal Blue (`#2563EB`)當作貴重資源 — 一個畫面只用一處。
- **Do** 用 `ring-1 ring-foreground/10` 作為 card 邊界,不用 `shadow-md`。
- **Do** 用 `font-variant-numeric: tabular-nums` 顯示所有金額。
- **Do** 把主要動作放在拇指可達的下半區(底部 nav、sheet 內底部 CTA)。
- **Do** 用 weight (400/500/600) 與 size (12/14/16/18/24) 拉開字級層次,單一 Geist 字族走到底。
- **Do** 在所有 transition / animation 外層尊重 `prefers-reduced-motion: reduce`(已在 globals.css 全域設定)。
- **Do** focus-visible 一律 `ring-3 ring-ring/50`,不論元件類型。

### Don't:
- **Don't** 像花俏記帳 App — **禁止**滿版彩色 emoji、紅綠強對比、農民曆配色、卡通插畫。
- **Don't** 像典型 SaaS dashboard — **禁止**大數字 + 漸層底 + 點綴小圖示的 hero metric 模板。
- **Don't** 像過度設計的旅遊 App — **禁止**大張風景照填底、漸層 hero、強迫情緒共鳴的標語。
- **Don't** 加 glassmorphism — **禁止** `backdrop-blur` 作為裝飾性效果。Dialog overlay 用實心半透黑就好。
- **Don't** 用 gradient text(`background-clip: text` + 漸層底)。emphasis 一律靠 weight 或 size。
- **Don't** 用 bounce / elastic 動畫。easing 用 ease-out exponential(`ease-out-quart` / `quint`)。
- **Don't** 用 box-shadow 來「讓 card 浮起」。Flat 是預設。
- **Don't** 用 side-stripe `border-left` >1px 作為彩色 accent。要強調用滿邊 ring 或背景色。
- **Don't** 寫 onboarding tutorial 與行銷文案 — 使用者就是熟人,知道怎麼用。empty state 一句話就好。
- **Don't** 用 `#000` 或 `#FFF`。永遠用 `Ink Slate` (`#0F172A`) 與 `Page White` (`#FFFFFF` 帶整套色票上下文)。
- **Don't** 用 em dash (`—` 或 `--`) 在 UI 文案。改用逗號、冒號、分號、句號、括號。
- **Don't** 為陌生使用者設計 — 沒有公開註冊轉換漏斗、沒有 referral、沒有「分享給朋友賺取點數」誘導。
