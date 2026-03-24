# 旅帳 — 日本旅遊記帳 App

AI 收據辨識、即時統計、多人記帳的日本旅遊記帳 PWA。

## 功能

- **AI 收據辨識** — 拍照上傳日文收據，Gemini AI 自動擷取店名、金額、品項、稅別，翻譯成繁體中文
- **逐條分類** — 掃描後每個品項可獨立選擇消費類別（餐飲、交通、購物等），也可一鍵全部指定
- **手動記帳** — 快速新增消費，支援類別、支付方式、店家、地區
- **即時 Dashboard** — 今日花費、旅程累計、現金預算進度
- **統計分析** — 每日趨勢、分類佔比、支付方式分布、TOP 10 消費
- **旅程日程** — 根據行程自動判斷消費地區
- **多人記帳** — 邀請旅伴加入（Email 搜尋），每筆消費可指定歸屬或均分
- **Notion 同步** — 自動將消費紀錄同步至 Notion Database
- **PWA** — 安裝到手機桌面，離線也能使用

## 技術棧

- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS + Realtime)
- Google Gemini 3 Flash (AI 收據辨識)
- Recharts (圖表)
- Notion API (同步)

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
```

### 4. 設定 Supabase Auth

1. **Authentication → Providers → Email**：啟用 Email provider
2. **Authentication → URL Configuration**：
   - Site URL 設為你的網站網址（開發時用 `http://localhost:3000`）
   - Redirect URLs 加入 `http://localhost:3000/auth/callback`
3. （可選）**Authentication → Providers → Google**：啟用 Google OAuth 並填入 Client ID / Secret
4. （可選）設定 Custom SMTP 以解除免費方案每小時 3 封驗證信的限制

### 5. 啟動開發伺服器

```bash
npm run dev
```

打開 http://localhost:3000

## 取得 API Keys

| 服務 | 取得方式 | 費用 |
|------|---------|------|
| Supabase | [supabase.com](https://supabase.com) 建立專案 | 免費 |
| Gemini API | [aistudio.google.com](https://aistudio.google.com) 取得 Key | 免費額度 |
| Notion | [notion.so/my-integrations](https://notion.so/my-integrations) 建立 Integration | 免費 |

## 專案結構

```
app/
├── (main)/            # 主要頁面（含底部導覽）
│   ├── page.tsx       # Dashboard 首頁
│   ├── scan/          # AI 收據掃描
│   ├── records/       # 消費紀錄列表
│   ├── stats/         # 統計分析
│   ├── settings/      # 設定（旅程、成員、Notion）
│   └── trip/          # 旅程管理、邀請、加入
├── api/               # API Routes
│   ├── ocr/           # Gemini 收據辨識
│   ├── expenses/      # 消費 CRUD
│   ├── trips/         # 旅程管理
│   └── ...
├── auth/              # 登入、OAuth callback
components/            # UI 元件
lib/                   # Supabase client、Gemini、匯率、Context
types/                 # TypeScript 型別定義
supabase/migrations/   # 資料庫 schema 與 RLS policy
```
