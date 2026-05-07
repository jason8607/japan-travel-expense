@AGENTS.md

# 旅帳 — 日本旅遊記帳 App

AI 收據辨識、即時統計、多人分帳、信用卡回饋追蹤的日本旅遊記帳 PWA。

## 技術棧

- 框架：Next.js 16（App Router + Route Handlers）
- 語言：TypeScript 5（strict mode）
- UI：React 19 + Tailwind CSS 4 + shadcn/ui
- 資料庫：Supabase（PostgreSQL + Auth + RLS + Realtime + Storage）
- AI：Google Gemini 3 Flash（收據辨識）
- 圖表：Recharts 3
- 圖片匯出：html-to-image（summary / recap 頁面匯出為圖片）
- 部署：Vercel
- 套件管理：npm
- Node.js 版本：v22

## 重要文件

- `types/index.ts` — 所有 TypeScript 型別定義
- `lib/context.tsx` — AppContext（user、profile、trips、currentTrip、tripMembers、guest mode）
- `lib/settlement.ts` — 分帳結算演算法（greedy 最小化轉帳次數）
- `lib/gemini.ts` — Gemini AI 收據辨識邏輯
- `lib/credit-cards.ts` — Guest 模式信用卡 localStorage 管理 + 預設卡片
- `lib/guest-storage.ts` — Guest 模式消費 localStorage 管理
- `components/recap/` — 旅後回顧元件（趣味統計卡片 + 可分享圖片）
- `proxy.ts` — Next.js 16 Proxy（session 管理 + 路由保護）
- `supabase/migrations/` — 18 個 DB migration（001-018），依序執行

## 常用指令

- `npm run dev`：啟動開發伺服器（port 3000）
- `npm run build`：建置專案
- `npx tsc --noEmit`：TypeScript 型別檢查

## 開發規範

### 命名規範

- 變數與函式：camelCase（`getCreditCards`）
- 元件與型別：PascalCase（`CreditCardPicker`、`CreditCard`）
- 常數：UPPER_SNAKE_CASE（`DEFAULT_CATEGORIES`）
- 元件檔案名稱：kebab-case（`credit-card-picker.tsx`）
- Hook 檔案名稱：kebab-case with `use-` prefix（`use-credit-cards.ts`）
- DB 欄位與 API 欄位：snake_case（`credit_card_plan_id`）

### TypeScript

- 禁止使用 `any`，必要時使用 `unknown` 搭配型別守衛
- 使用 `interface` 定義物件型別，使用 `type` 定義聯合型別
- 所有型別集中定義在 `types/index.ts`

### 架構模式

- **雙模式**：Guest（localStorage）+ Authenticated（Supabase），guest 可遷移到帳號
- **分帳**：`split_type`（personal/split）+ `owner_id`（誰的）+ `paid_by`（誰付的）
- **信用卡方案**：`CreditCard` 可有多個 `CreditCardPlan`，每個方案不同回饋%，上限共用
- **OCR**：Gemini 辨識日文收據 → 逐品項分帳 → 每人每日 50 次限制
- **Realtime**：useExpenses hook 訂閱 Supabase realtime channel
- **圖片匯出**：html-to-image 擷取 DOM → PNG，支援 Web Share API（手機分享）+ 下載 fallback
- **頁面定位**：`/summary` 為數據報表（圖表、結算、CSV），`/recap` 為趣味亮點（給朋友看、可分享圖片）

### 資料庫

- 所有 table 都有 RLS policy（select/insert/update/delete）
- 主要表：profiles、trips、trip_members、expenses、expense_items、credit_cards、credit_card_plans、ocr_usage、custom_categories
- Migration 編號延續現有（目前到 018），不可跳號或重號
- 信用卡方案更新使用 upsert 策略（保留 plan ID），不可 delete-reinsert

### 錯誤處理

- API Route 使用 try-catch 包裹，回傳統一格式 `{ error: "訊息" }` + HTTP status
- 前端使用 sonner toast 顯示成功/錯誤訊息
- Supabase 操作使用 admin client（service role），不在前端直接操作 DB

## 回應規範

- 一律使用繁體中文回應
- commit message 使用 Conventional Commits 格式，描述使用英文
- UI 文字使用繁體中文，程式碼中的變數名稱與註解使用英文

## 常見任務

### 新增 DB 欄位

1. 在 `supabase/migrations/` 建立新的 migration SQL
2. 在 `types/index.ts` 更新對應的 interface
3. 在 `app/api/` 對應的 route 更新 CRUD 邏輯
4. 在 `lib/guest-storage.ts` 更新 guest 模式（如適用）
5. 在相關 UI 元件中加入欄位

### 新增 API Route

1. 在 `app/api/` 底下建立 `route.ts`
2. 使用 `getRequestUser()` 驗證身份
3. 使用 `getAdminClient()` 操作 Supabase
4. 回傳格式：成功 `{ data }` / 失敗 `{ error }` + 對應 HTTP status

### 新增信用卡功能

1. 更新 `types/index.ts`（CreditCard / CreditCardPlan）
2. 更新 `app/api/credit-cards/route.ts`
3. 更新 `lib/credit-cards.ts`（guest localStorage）
4. 更新 `hooks/use-credit-cards.ts`
5. 更新 `components/settings/credit-card-manager.tsx`（設定 UI）
6. 更新 `components/expense/credit-card-picker.tsx`（選卡 UI）
7. 更新 `components/stats/cashback-chart.tsx`（回饋統計）
