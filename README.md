# 旅帳 — 日本旅遊記帳 App

AI 收據辨識、即時統計、多人記帳的日本旅遊記帳 PWA。

## 功能

- **AI 收據辨識** — 拍照上傳日文收據，Gemini AI 自動擷取店名、金額、品項、稅別，翻譯成繁體中文
- **手動記帳** — 快速新增消費，支援類別、支付方式、店家、地區
- **即時 Dashboard** — 今日花費、旅程累計、現金預算進度
- **統計分析** — 每日趨勢、分類佔比、支付方式分布、TOP 10 消費
- **旅程日程** — 根據行程自動判斷消費地區
- **多人記帳** — 邀請旅伴加入，頭像區分，即時同步
- **Notion 同步** — 自動將消費紀錄同步至 Notion Database
- **PWA** — 安裝到手機桌面，離線也能使用

## 技術棧

- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Google Gemini 2.0 Flash (AI 收據辨識)
- Recharts (圖表)
- Notion API (同步)

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.local` 並填入你的 API Keys：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_Supabase_Anon_Key
SUPABASE_SERVICE_ROLE_KEY=你的_Service_Role_Key
GOOGLE_GEMINI_API_KEY=你的_Gemini_API_Key
```

### 3. 設定 Supabase 資料庫

到 Supabase Dashboard 的 SQL Editor 執行 `supabase/migrations/001_initial.sql`。

### 4. 啟動開發伺服器

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
