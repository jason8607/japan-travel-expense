# 旅帳 Editorial 重設計：執行計畫

分支：`design/editorial-v2`（從 main 分出，main 完全沒改）
設計參考：`design.md`、Travelio 原型（`/Users/jason8607/Downloads/Travelio/`）

---

## 目前狀態

### 已完成

- 編輯風 design tokens + utility CSS（`app/(main)/editorial.css`）
- Google Fonts 全域載入（`app/layout.tsx`）：Shippori Mincho、Noto Serif TC、JetBrains Mono、Inter
- Bottom Nav 編輯風 restyle（serif label + 朱紅 active 底線）
- 3 個頁面改寫（`(main)/layout.tsx` 包 `.editorial-app`）
  - HomePage 首頁 dashboard
  - Records 記帳列表
  - Records/new 新增 / 編輯消費（**簡化版**，見下方功能缺口）
- 點擊 row 滑出明細 bottom sheet（`components/expense/expense-detail-sheet.tsx`）
  - 桌機已加 max-width: 32rem 避免延伸全螢幕

### 改動檔案

```
app/layout.tsx                                 # 全域字體
app/(main)/layout.tsx                          # .editorial-app wrapper + 載入 editorial.css
app/(main)/editorial.css                       # 新增（design tokens + utility）
app/(main)/page.tsx                            # 改寫 HomePage
app/(main)/records/page.tsx                    # 改寫 Records
app/(main)/records/new/page.tsx                # 改寫 NewExpense（簡化）
components/layout/bottom-nav.tsx               # 加 data-style="editorial"
components/expense/expense-detail-sheet.tsx    # 新增
```

---

## 已知功能缺口（需後續決策）

### Records/new（新增 / 編輯消費）

簡化版砍掉的功能：

- ❌ 信用卡選擇器 + 方案 picker（`CreditCardPicker`）
- ❌ OCR 預填欄位（從 `/scan` 跳轉時自動帶入）
- ❌ 多品項分帳（ExpenseItem，每行不同金額不同分法）
- ❌ 自訂分帳比例 / 指定誰付款（`paid_by`、`owner_id`）
- ❌ 備註 textarea
- ❌ 收據圖片上傳 / 預覽
- ❌ 日期 / 時間挑選（目前固定當天）

保留：title / amount / 幣別 toggle / 分類 / 付款方式 / 個人 vs 平分

### Records 列表

砍掉的功能：

- ❌ 搜尋輸入框
- ❌ 分類 / 付款方式篩選
- ❌ 群組切換（按類別 / 按成員 / 結算）
- ❌ MemberSummary（每人花費摘要）
- ❌ SettlementView（結算演算法產出的轉帳建議）

保留：Day tabs 切換、CSV 匯出、刪除（搬到 detail sheet）

### HomePage

砍掉的功能：

- ❌ Big summary card（用 mega 標題替換）
- ❌ ExpenseCard 系列元件（用 ed-row 替換）
- ❌ 匯率 pill 區塊（合進大標題下方 mono 字）

保留：guest banner、預算 bar、今日 / 回饋雙欄、最近消費 top 3

---

## 待辦清單（按優先順序）

### Phase 1 — 補齊 3 個已改頁面的關鍵功能

> 目標：先讓改寫的頁面達到「實際可用」程度，再擴張到其他頁面。

- [x] **Records/new 補回信用卡選擇器**
      ed-chip 列表（卡片名 + 回饋率 mono 標示），選卡後展開方案 row。只在付款方式 = 信用卡時顯示。沒設定卡片時顯示 → /settings 連結
- [x] **Records/new 補回備註欄**
      dashed 底線透明底 textarea，襯線斜體（editorial 註解風格）
- [x] **Records/new 補回日期挑選**
      ed-input-line 樣式 `<input type="date">`，編輯時 hydrate 既有 expense_date
- [x] **Records 補回搜尋 / 篩選**
      Q 標 + 下底線搜尋 input（搜 title / store_name / note）、分類 chip row（含「全部」）。Day tabs 並存
- [ ] **Records 補回 group-by 切換**
      或做一個全新的「按類別 / 按成員 / 結算」入口（可考慮 sub-page，目前留待 Phase 2）
- [x] **Records empty state 美化**
      「空」字 + 兩段引言。空白 vs 篩選後無結果分支：前者顯示「新增一筆 / 掃描收據」雙鈕，後者顯示「清除篩選」

### Phase 2 — 擴張到剩餘頁面

> 順序由使用頻率排，OCR 掃描優先（高頻動作）。

- [ ] **`/scan` OCR 掃描頁**
      參考設計稿 12（空狀態）/ 13（辨識中）/ 14（OCR 確認）。
      重點：黑色背景 + 朱紅角框 + 雷射動畫 + 收據卡片旋轉 -1.2°。
      OCR 完成後跳轉 `/records/new?fromScan=...` 預填表單
- [ ] **`/stats` 統計頁**
      參考設計稿（D2/D3 receipt + ticket direction）。
      donut chart + week bars 已有編輯風範例（lib/screens-stats.jsx）
- [ ] **`/settings` 設定頁**
      參考設計稿（screens-settings.jsx）。
      `.setRow` + `.setGroup` 已在 Travelio CSS 有定義，需 port 到 editorial.css
- [ ] **`/summary` 報表頁**
      圖表 + CSV 匯出。recharts theme 需要 alignment 到 editorial palette
- [ ] **`/recap` 旅後回顧**
      已是分享導向頁面，editorial 大標 + 趣味卡片很適合。html-to-image 匯出邏輯保留
- [ ] **`/trip/new` + `/trip/[id]/...`**
      旅程建立 / 行程表 / 加入旅程。低頻但需 tone consistent

### Phase 3 — 細節打磨

- [ ] **Loading state 統一**
      目前用「LOADING…」文字。可考慮做一個編輯風 skeleton loader
- [ ] **Empty state 統一**
      「空」字 + serif 引言 + 動作按鈕的模式可變成共用 component
- [ ] **Error state**
      錯誤訊息目前用 sonner toast，但頁面層級錯誤要有 editorial 樣式
- [ ] **Dark mode**
      editorial 全套米色＋朱紅在 dark 下要重畫，先決定要不要做（目前 lib/theme-context.tsx 還有切換邏輯）
- [ ] **Self-host webfonts**
      4 個 Google Fonts 全域載 FOUT 嚴重，production 前 subset + self-host
- [ ] **Toast 樣式調整**
      `<Toaster>` 樣式跟編輯風衝突，需改 sonner theme

---

## 待決策事項

### 1. 範圍：要不要做完整套替換？

**A. 全套替換**：把所有頁面改完，main 切到 editorial 為新基準
- 優點：視覺一致、品牌記憶強
- 缺點：工作量大（剩 6 個 section），舊功能（信用卡、結算等）需要逐一 redesign
- 估時：2–3 個工作週

**B. 只保留 home + records 的 editorial，其他頁面維持舊版**
- 優點：快速結案
- 缺點：APP 內視覺混搭，bottom nav 已被改成 editorial 會跟舊頁面違和

**C. 完全不採用**：merge main 不要這個分支
- 優點：保留現有功能完整性
- 缺點：白做（但設計探索本來就是這樣）

→ **建議先做 Phase 1 完整補齊 3 頁，看實際使用感受再決定 A / B / C**

### 2. 功能完整 vs 設計純淨

OCR 預填、信用卡 picker、多品項分帳這些「實用功能」加進編輯風 mockup 後可能破壞構圖。
要決定：是把功能藏進 sub-screen / drawer，還是接受表單變長？

### 3. 字體授權與性能

Shippori Mincho 與 Noto Serif TC 都是 Google Fonts SIL OFL 授權，可商用。但全載 4 套 webfont、CJK 字檔大（每個約 1–3MB），首次載入 FOUT 明顯。

→ Production 前必須 subset（只載入會用到的字）+ self-host。

### 4. 與 PWA install prompt / Toast 的整合

目前 `<InstallPrompt>` 與 `<Toaster>` 都還是 shadcn 風格，會在 editorial 頁面看到不一致樣式。
要決定：何時 / 是否 restyle 這些全域元件。

---

## 操作備忘

- 切回 main：`git checkout main`（current branch is editorial-v2）
- 提交目前進度：`git add -A && git commit -m "<msg>"`（用戶手動觸發，沒自動 commit）
- 啟動 dev server：`npm run dev` → http://localhost:3000/
- 看編輯風格頁面：guest 模式 → 建立旅程 → 進首頁 / 記帳列表 / 新增消費
- TypeScript check：`npx tsc --noEmit`
