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
