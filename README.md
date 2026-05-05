# 旅帳 — 日本旅遊記帳 App

AI 收據辨識、即時統計、多人分帳、信用卡回饋追蹤的日本旅遊記帳 PWA。

## 功能

- **AI 收據辨識** — 拍照上傳日文收據，Gemini AI 自動擷取店名、金額、品項、稅別，翻譯成繁體中文
- **逐條分帳** — 掃描後每個品項可獨立指定歸屬（自己 / 幫付 / 均分），也可一鍵全部指定
- **手動記帳** — 快速新增消費，支援 9 種預設類別 + 自訂類別、多種支付方式
- **彈性分帳** — 每筆消費可選「只記自己」、「全員均分」或「自選成員均分」（適合部分人共享某餐／某活動的場景），按成員檢視個人花費與結算
- **結算摘要** — 自動計算誰欠誰多少，最小化轉帳次數
- **信用卡回饋追蹤** — 設定多張卡片及可切方案（如台新 Richart、國泰 Cube），追蹤各卡回饋進度與上限
- **即時 Dashboard** — 今日花費、旅程累計、預算進度、即時匯率
- **統計分析** — 每日趨勢、分類佔比、支付方式分布、TOP 10 消費、信用卡回饋明細
- **旅後回顧** — Spotify Wrapped 風格的趣味統計卡片（最愛類別、最常造訪的店、最貴一筆、信用卡省多少等），可匯出圖片分享到 LINE / IG
- **圖片匯出** — 旅行總結頁面可一鍵匯出整頁為圖片，手機上可直接分享
- **多旅程管理** — 建立多個旅程並自由切換，全站資料隨當前旅程變動
- **成員管理** — 透過邀請連結邀請旅伴，旅程建立者可移除成員（消費紀錄自動轉移）
- **Google 登入** — 支援 Google OAuth 與 Email 註冊登入
- **個人化頭像** — 預設 Google 頭像，可自訂上傳或選擇動物 emoji
- **OCR 用量管控** — 每人每日 50 次辨識上限，防止 API 濫用
- **PWA** — 安裝到手機桌面，支援離線使用（Guest 模式）

## 技術棧

- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS + Realtime + Storage)
- Google Gemini 3 Flash (AI 收據辨識)
- Recharts (圖表)
- html-to-image (頁面匯出為圖片)
- Vercel (部署)

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

建立 `.env.local` 並填入你的 API Keys：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key
SUPABASE_SERVICE_ROLE_KEY=你的_Service_Role_Key
GOOGLE_GEMINI_API_KEY=你的_Gemini_API_Key
```

### 3. 設定 Supabase 資料庫

到 Supabase Dashboard 的 SQL Editor，**依序**執行所有 migration：

```
supabase/migrations/001_initial.sql
supabase/migrations/002_add_split_type.sql
supabase/migrations/003_add_owner_id.sql
supabase/migrations/004_find_user_by_email.sql
supabase/migrations/005_fix_trip_members_rls.sql
supabase/migrations/006_ocr_usage.sql
supabase/migrations/007_security_hardening.sql
supabase/migrations/008_add_credit_card_id.sql
supabase/migrations/009_custom_categories.sql
supabase/migrations/011_trip_budget.sql
supabase/migrations/012_input_currency.sql
supabase/migrations/013_add_note.sql
supabase/migrations/014_receipts_bucket.sql
supabase/migrations/015_credit_card_plans.sql
supabase/migrations/016_seed_default_credit_cards.sql
supabase/migrations/017_drop_notion_columns.sql
supabase/migrations/018_expense_participants.sql
```

> 注意：編號 010 為刻意跳號保留位，無對應檔案。後續 migration 編號**繼續往上**，不要回填 010。

### 4. 設定 Supabase Auth

1. **Authentication → Providers → Email**：啟用 Email provider
2. **Authentication → URL Configuration**：
   - Site URL 設為你的網站網址（開發時用 `http://localhost:3000`）
   - Redirect URLs 加入 `http://localhost:3000/auth/callback`
3. （可選）**Authentication → Providers → Google**：啟用 Google OAuth 並填入 Client ID / Secret
4. （可選）設定 Custom SMTP 以解除免費方案每小時 3 封驗證信的限制

### 5. 設定 Supabase Storage

1. **Storage → New bucket**：建立名為 `avatars` 的 bucket（Public）
2. **Storage → New bucket**：建立名為 `receipts` 的 bucket（Private）
3. 設定 bucket policy 允許 authenticated 用戶上傳

### 6. 啟動開發伺服器

```bash
npm run dev
```

打開 http://localhost:3000

### 7. 部署到 Vercel

```bash
npx vercel --prod
```

在 Vercel Dashboard 設定環境變數（同 `.env.local`）。

## 取得 API Keys

| 服務 | 取得方式 | 費用 |
|------|---------|------|
| Supabase | [supabase.com](https://supabase.com) 建立專案 | 免費 |
| Gemini API | [aistudio.google.com](https://aistudio.google.com) 取得 Key | 免費額度（每日有上限）|

## 專案結構

```
app/
├── (main)/            # 主要頁面（含底部導覽）
│   ├── page.tsx       # Dashboard 首頁
│   ├── scan/          # AI 收據掃描
│   ├── records/       # 記帳紀錄列表 + 新增
│   ├── stats/         # 統計分析
│   ├── summary/       # 結算摘要（含圖片匯出）
│   ├── recap/         # 旅後回顧（趣味統計 + 可分享圖片）
│   ├── settings/      # 設定（旅程、成員、信用卡、個人資料）
│   └── trip/          # 旅程管理、邀請、加入、行程
├── api/               # API Routes
│   ├── ocr/           # Gemini 收據辨識（含用量限制）
│   ├── expenses/      # 消費 CRUD（含分頁）
│   ├── trips/         # 旅程管理
│   ├── trip-members/  # 成員管理（含移除與消費轉移）
│   ├── credit-cards/  # 信用卡 + 方案 CRUD
│   ├── categories/    # 自訂類別 CRUD
│   ├── avatar/        # 頭像上傳
│   ├── receipt-image/ # 收據圖片
│   ├── exchange-rate/ # 即時匯率
├── auth/              # 登入、OAuth callback
components/
├── dashboard/         # Dashboard（預算進度、旅程摘要）
├── expense/           # 消費相關（表單、卡片、分帳、結算）
├── scan/              # 收據掃描（上傳、確認、逐條分帳）
├── settings/          # 設定（類別管理、信用卡管理）
├── recap/             # 旅後回顧（統計卡片、可分享圖片）
├── stats/             # 圖表（分類、支付、趨勢、回饋進度）
├── layout/            # 頁面框架（Header、Nav、載入、PWA 安裝提示）
└── ui/                # shadcn/ui 基礎元件
hooks/                 # 自訂 Hooks（消費、類別、信用卡）
lib/                   # Supabase client、Gemini、匯率、Context、結算、匯出
types/                 # TypeScript 型別定義
supabase/migrations/   # 資料庫 schema 與 RLS policy（001-018，跳號 010）
proxy.ts               # Next.js 16 Proxy（路由保護、session 管理）
```
