# 旅帳 Editorial 重設計：執行計畫

分支：`design/editorial-v2`（從 main 分出）
設計參考：`design.md`、Travelio 原型（`/Users/jason8607/Downloads/Travelio/`）

> 已完成的進度看 git log。本檔只記**還沒做的事**與**還沒決定的事**。

---

## 待辦清單

### Phase 2 — 把編輯風擴張到剩餘頁面

> 順序按使用頻率，OCR 掃描最高優先。
> ⚠️ 結算入口已從 `/summary` 搬到 records 第 4 個 tab，`/summary` 之後可瘦身為純圖表 + CSV。

- [x] **`/scan` OCR 掃描頁**
      ✅ 黑底 + 朱紅角框 + 雷射 sweep + 收據卡片 rotate(-1.2deg)
      ✅ Masthead（kicker + 大標 + 朱紅句點）三段狀態切換（intake / 辨識中 / 確認）
      ✅ ReceiptConfirm 換成 ed-item / ed-chip / ed-chip-sm pattern
      ⚠️ `?fromScan=` 預填 records/new 仍未做（屬決策事項 #2，待決定後再處理）
- [ ] **`/stats` 統計頁**
      donut chart + week bars 已有編輯風範例（`lib/screens-stats.jsx`）
- [ ] **`/settings` 設定頁**
      `.setRow` + `.setGroup` 已在 Travelio CSS 有定義，需 port 到 `editorial.css`
- [ ] **`/summary` 報表頁**
      圖表 + CSV 匯出。recharts theme 需 align 到 editorial palette
- [ ] **`/recap` 旅後回顧**
      編輯風大標 + 趣味卡片很適合，html-to-image 匯出邏輯保留
- [ ] **`/trip/new` + `/trip/[id]/...`**
      旅程建立 / 行程表 / 加入旅程

### Phase 3 — 細節打磨

- [ ] **Loading state 統一** — 編輯風 skeleton loader（取代「LOADING…」文字）
- [ ] **Empty state 統一** — 「空」字 + serif 引言 + 動作按鈕共用 component
- [ ] **頁面層級錯誤狀態** — editorial 樣式（toast 仍用 sonner）
- [ ] **Self-host webfonts** — production 前 subset + self-host 4 個 Google Fonts
- [ ] **Toast 樣式調整** — 改 sonner theme 對齊編輯風

### Records/new 仍缺的功能（待決策事項 #2 決定後再做）

- [ ] OCR 預填欄位（從 `/scan` 跳轉時自動帶入）
- [ ] 多品項分帳（ExpenseItem，每行不同金額不同分法）
- [ ] 自訂分帳比例 / 指定誰付款（`paid_by`、`owner_id`）
- [ ] 收據圖片上傳 / 預覽

---

## 待決策事項

### 1. 範圍：要不要做完整套替換？

- **A. 全套替換**：所有頁面改完，main 切到 editorial。估時 2–3 工作週
- **B. 只保留 home + records**：快速結案，但 bottom nav 已 editorial 化會跟舊頁面違和
- **C. 完全不採用**：merge main 不要這個分支

→ **建議先做 Phase 2 第一項（OCR 掃描）看實際感受再決定**

### 2. 功能完整 vs 設計純淨

OCR 預填、信用卡 picker、多品項分帳這些「實用功能」加進編輯風 mockup 後可能破壞構圖。
要決定：藏進 sub-screen / drawer，還是接受表單變長？

---

## 操作備忘

- 切回 main：`git checkout main`
- dev server：`npm run dev`（http://localhost:3000）
- 看編輯風：guest 模式 → 建立旅程 → home / records / records/new
