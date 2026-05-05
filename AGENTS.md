<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Coding Guidelines

- 語言：UI 文字使用繁體中文，code 和 comments 用英文
- 所有 Supabase 操作使用 admin client（service role），不在前端直接操作 DB
- Guest 模式用 localStorage（lib/guest-storage.ts、lib/credit-cards.ts），登入模式用 Supabase API
- 新增 DB 欄位需同時更新：types/index.ts、API route、guest-storage（如適用）、相關 UI 元件
- Migration 編號延續現有（目前到 016），不可跳號或重號
- RLS policy 必須涵蓋 select/insert/update/delete
- 信用卡方案更新使用 upsert 策略（保留 plan ID），不可 delete-reinsert（會斷開 expense 的 plan_id 參照）

## Design Context

設計策略與視覺系統由兩份文件主導,寫新介面前先讀:

- **PRODUCT.md** — register、目標使用者、品牌個性、anti-references、5 個策略原則(私人工具優先 / 簡約勝於裝飾 / 單手可操作 / AI 無聲 / 分帳零摩擦)
- **DESIGN.md** — 視覺 tokens 與規則:Creative North Star「The Pocket Ledger」、Signal Blue (`#2563EB`) 唯一動作色、Ink Slate (`#0F172A`) 文字、Mist (`#F1F5F9`) 中性、Geist 單字族、`ring-1` 取代 shadow、`active:translate-y-px` 取代 scale。完整 Do's / Don'ts 在第 6 節
- **DESIGN.json** — 機器可讀的元件 HTML/CSS sidecar,8 個 canonical 元件 + tonal ramps + motion tokens

`$impeccable` 系列指令(craft / shape / critique / polish ...)會自動讀取這三份檔案。手寫新介面也應比對這三份的 anti-references 與 Named Rules。

回覆一率繁體中文