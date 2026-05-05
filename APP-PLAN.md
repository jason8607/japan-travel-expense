# 旅帳 → iOS App 打包計畫

> **For agentic workers:** 這份計畫是 iOS 打包/devops 任務,不適用 TDD。每個 task 是一段可執行步驟,完成後 commit。Steps 使用 checkbox (`- [ ]`) 語法追蹤。

**Goal:** 把現有 Next.js PWA 包成 iOS app,以 **自己手機自簽安裝** 為優先目標(零成本路徑),保留升級 App Store 的擴展性。

**Architecture:** 採用 **Capacitor hybrid 殼** 包覆既有 Next.js app。優先採用「純 WebView + 指向 Vercel 部署」的最簡路線,前端、API、auth 完全不動,僅做最少的相容性調整。後續可選擇升級為靜態打包 (offline) 或正式上架。

**Tech Stack:** Capacitor 6 + Xcode 16+ + 既有 Next.js 16 / Supabase / Gemini stack

**前提:** macOS + 已安裝 Xcode + 一支 iPhone + 已部署 Vercel(現狀:`.vercel/project.json` 存在,假設已部署)

---

## 路線總覽

| 路線 | 工時 | 成本 | 用途 |
|------|------|------|------|
| **A. 純 WebView 套殼**(本計畫主軸) | 0.5–1 天 | $0 | 自用、體驗 native 殼、可上 TestFlight |
| **B. Hybrid 靜態打包**(可選擴展) | +2–3 天 | $0 | 離線可用、減少 Vercel 流量 |
| **C. App Store 上架**(可選擴展) | +1–2 天 | $99/年 | 對外發佈 |

本計畫以 **Phase 1 完成 = 路線 A 可運行** 為交付里程碑。Phase 2/3 列為延伸 task,可日後再啟動。

---

## Phase 0:決策與前置

### Task 0.1:確認 Vercel 部署 URL 可用

**Files:** 無(只查資訊)

- [ ] **Step 1:確認 Vercel deploy URL**

執行:
```bash
cat .vercel/project.json
vercel ls 2>/dev/null | head
```

需取得 production URL(例如 `https://japan-travel-expense.vercel.app`),並用手機 Safari 打開確認:
- 能登入(Google OAuth)
- 能掃描收據(OCR)
- 能新增/檢視消費

**Expected:** Web 版本一切正常。如有 bug 先在 Vercel 端修完,再進 Capacitor。

- [ ] **Step 2:把 production URL 記在本檔最後的「設定值」區塊**

### Task 0.2:確認 Apple ID 可用於 Xcode signing

**Files:** 無

- [ ] **Step 1:打開 Xcode → Settings → Accounts → 加入 Apple ID**

如果是免費帳號,Team 會顯示為「Personal Team (你的名字)」,可以做 development signing,**裝出來的 app 7 天到期需要重簽**。

- [ ] **Step 2:接 iPhone 到 Mac,在 Xcode 裡確認 device 出現**

選單:Window → Devices and Simulators。手機要選「Trust This Computer」。

---

## Phase 1:Capacitor 套殼(主路徑,最快可裝機)

### Task 1.1:安裝 Capacitor 並初始化

**Files:**
- 修改:`package.json`
- 建立:`capacitor.config.ts`
- 建立:`out/`(空 placeholder 資料夾,Capacitor 必須有 webDir)

- [ ] **Step 1:安裝相依套件**

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios
```

- [ ] **Step 2:建立空的 webDir(純 WebView 模式不會用到,但 cli 會檢查存在)**

```bash
mkdir -p out
echo '<!DOCTYPE html><meta http-equiv="refresh" content="0;url=https://japan-travel-expense.vercel.app/" />' > out/index.html
```

> 把上面的 URL 換成你的實際 Vercel URL。這是 fallback,當 server URL 連不上時 Capacitor 會 fallback 到這個本地檔。

- [ ] **Step 3:建立 `capacitor.config.ts`**

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jasonchen.ryocho",
  appName: "旅帳",
  webDir: "out",
  server: {
    url: "https://japan-travel-expense.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
```

> `appId` 用反向網域,自己擁有的網域最好;沒有就用任意唯一字串(例如 `com.jasonchen.ryocho`)。**之後不要改,改了等同新 app**。

- [ ] **Step 4:Commit**

```bash
git add package.json package-lock.json capacitor.config.ts out/index.html
git commit -m "chore: add capacitor for ios packaging"
```

### Task 1.2:加入 iOS 平台

**Files:**
- 建立:`ios/`(整個 native 專案目錄)

- [ ] **Step 1:加入 iOS 平台**

```bash
npx cap add ios
```

這會產生 `ios/App/App.xcworkspace`,即之後 Xcode 開啟的入口。

- [ ] **Step 2:同步 config 到 iOS 殼**

```bash
npx cap sync ios
```

- [ ] **Step 3:把 `ios/` 加進 git,但忽略 build 產物**

`.gitignore` 加入:
```
ios/App/build/
ios/App/Pods/
ios/App/App/public/
ios/DerivedData/
```

> `ios/App/App/public/` 是 `cap sync` 從 `webDir` 複製的副本,不需要進 git。

- [ ] **Step 4:Commit**

```bash
git add ios/ .gitignore
git commit -m "chore: add ios platform via capacitor"
```

### Task 1.3:設定 iOS 權限(相機、相簿、分享)

**Files:**
- 修改:`ios/App/App/Info.plist`

- [ ] **Step 1:在 Xcode 開啟 `ios/App/App.xcworkspace`**

```bash
npx cap open ios
```

- [ ] **Step 2:在 Xcode 左側 navigator 找到 `Info.plist`,加入下列 key**

| Key | Value(中文說明會出現在系統權限彈窗) |
|---|---|
| `NSCameraUsageDescription` | `需要相機權限以拍攝收據進行 AI 辨識` |
| `NSPhotoLibraryUsageDescription` | `需要相簿權限以選取收據照片` |
| `NSPhotoLibraryAddUsageDescription` | `需要儲存匯出的圖片到相簿` |

> 直接編輯 `ios/App/App/Info.plist` XML 也可以,但 Xcode 介面比較不會打錯。

- [ ] **Step 3:確認 plist 內容**

```bash
grep -A1 "NSCameraUsage\|NSPhotoLibrary" ios/App/App/Info.plist
```

預期看到三個 key 都存在。

- [ ] **Step 4:Commit**

```bash
git add ios/App/App/Info.plist
git commit -m "chore(ios): add camera and photo library usage descriptions"
```

### Task 1.4:處理 OAuth redirect(Google 登入)

> 純 WebView 套殼裡 Google OAuth 會被 Google 擋(他們不允許 embedded WebView 登入)。需要用 `@capacitor/browser` 開系統瀏覽器登入後再回 app。

**Files:**
- 修改:`package.json`(加 `@capacitor/browser`)
- 修改:`ios/App/App/Info.plist`(加 URL Scheme)
- 修改:`app/auth/login/page.tsx`(偵測 Capacitor 環境)
- 修改:`lib/supabase/client.ts` 或新建 `lib/auth/oauth-bridge.ts`

- [ ] **Step 1:安裝 plugin**

```bash
npm install @capacitor/browser @capacitor/app
npx cap sync ios
```

- [ ] **Step 2:在 `capacitor.config.ts` 加上 deep link scheme**

```typescript
ios: {
  contentInset: "automatic",
  limitsNavigationsToAppBoundDomains: false,
  scheme: "ryocho",
},
```

- [ ] **Step 3:在 `Info.plist` 加 URL scheme**

`ios/App/App/Info.plist` 加入:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>ryocho</string>
    </array>
  </dict>
</array>
```

- [ ] **Step 4:在 Supabase Dashboard 設定 redirect URLs**

到 Supabase Dashboard → Authentication → URL Configuration,把下列加入「Redirect URLs」白名單:
```
ryocho://auth/callback
https://japan-travel-expense.vercel.app/auth/callback
```

- [ ] **Step 5:在 login 流程加入 Capacitor 偵測**

建立 `lib/capacitor.ts`:
```typescript
import { Capacitor } from "@capacitor/core";

export const isNativeApp = () => Capacitor.isNativePlatform();
```

修改 `app/auth/login/page.tsx` 的 Google 登入 handler:
```typescript
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { isNativeApp } from "@/lib/capacitor";

const handleGoogleLogin = async () => {
  const redirectTo = isNativeApp()
    ? "ryocho://auth/callback"
    : `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: isNativeApp() },
  });

  if (error) {
    toast.error("登入失敗");
    return;
  }

  if (isNativeApp() && data.url) {
    await Browser.open({ url: data.url });
  }
};
```

- [ ] **Step 6:在 root layout 註冊 deep link listener**

修改 `app/layout.tsx` 或新建 `components/layout/deep-link-handler.tsx`(`"use client"`):
```typescript
"use client";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase/client";

export function DeepLinkHandler() {
  useEffect(() => {
    const sub = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith("ryocho://auth/callback")) return;
      const fragment = url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        await Browser.close();
        window.location.href = "/";
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, []);
  return null;
}
```

把 `<DeepLinkHandler />` 加進 `app/layout.tsx` 的 `<body>` 裡。

- [ ] **Step 7:把 Supabase OAuth 設定改成 implicit flow(回傳 token in URL fragment)**

`lib/supabase/client.ts` 確認 `flowType: "implicit"`(若是 PKCE 在 native 較複雜)。

- [ ] **Step 8:Commit**

```bash
git add lib/capacitor.ts components/layout/deep-link-handler.tsx app/layout.tsx app/auth/login/page.tsx capacitor.config.ts ios/App/App/Info.plist package.json package-lock.json
git commit -m "feat(ios): native oauth via system browser + deep link"
```

> ⚠️ 此 task 是整個 plan 最容易踩雷的一段。建議先跳過此 task,在 Phase 1.6 安裝後 **先用 guest mode 測試 app**,確認套殼本身可運作,再回來做 OAuth。

### Task 1.5:處理圖片分享(html-to-image + Web Share)

> 現有 `lib/share-image.ts` 已偵測 iOS PWA(`isIosStandalone`),Capacitor 的 `navigator.share` 也能用,但行為不同:Capacitor WebView 內 `navigator.share` 會走系統 share sheet,基本可運作,但若失敗需要 fallback 到 `@capacitor/filesystem` 寫到相簿。

**Files:**
- 修改:`lib/share-image.ts`(加 Capacitor 分支)
- 修改:`package.json`

- [ ] **Step 1:安裝 plugin**

```bash
npm install @capacitor/filesystem @capacitor/share
npx cap sync ios
```

- [ ] **Step 2:在 `lib/share-image.ts` 加入 Capacitor 路徑**

關鍵改動:在 `shareOrDownloadFile` 開頭加入:
```typescript
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

if (Capacitor.isNativePlatform()) {
  const base64 = await blobToBase64(blob);
  const fileResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({
    title: filename,
    url: fileResult.uri,
  });
  return;
}
// ... 既有 web 邏輯
```

`blobToBase64` helper:
```typescript
const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
```

- [ ] **Step 3:Commit**

```bash
git add lib/share-image.ts package.json package-lock.json
git commit -m "feat(ios): native share via capacitor filesystem + share plugin"
```

### Task 1.6:在 Xcode build 到實機

**Files:** 無(全在 Xcode GUI)

- [ ] **Step 1:同步最新 config**

```bash
npx cap sync ios
npx cap open ios
```

- [ ] **Step 2:在 Xcode 設定 signing**

- 左側選 `App` project → TARGETS → `App` → Signing & Capabilities
- ☑️ Automatically manage signing
- Team:選你的 Personal Team(免費 Apple ID)
- Bundle Identifier:確認是 `com.jasonchen.ryocho`(若 Apple ID 已用過此 ID 會衝突,改一個唯一字串)

- [ ] **Step 3:選擇你的 iPhone 為 destination,按 ▶ Run**

第一次會跳:
- Mac 端 Keychain 要密碼(信任本機 cert)
- iPhone 上要去 Settings → General → VPN & Device Management → 信任 Personal Team 憑證

- [ ] **Step 4:確認 app 啟動後可以看到旅帳首頁**

如果只能看到白屏 → 進入 Xcode console 看錯誤,通常是 server URL 寫錯或網路問題。

- [ ] **Step 5:Guest mode 完整測試流程**

不登入直接用 guest mode 跑一輪:
- 建立行程
- 拍/選照片掃收據(測 OCR)
- 新增消費
- 看統計
- 匯出圖片(測 share)

- [ ] **Step 6:測試完成後做一個 commit checkpoint**

```bash
git commit --allow-empty -m "chore(ios): phase 1 verified working on device"
```

### Task 1.7:7 天重簽流程文件化

**Files:**
- 建立:`docs/ios-resign.md`(可選,純筆記)

- [ ] **Step 1:在重簽流程記下指令**

```bash
# 重簽流程(每 7 天):
# 1. 把 iPhone 接到 Mac
# 2. 執行:
npx cap sync ios && npx cap open ios
# 3. Xcode 選 device → Run
# 完成,憑證刷新 7 天
```

> 之後若受不了 7 天重簽 → 升級成 Apple Developer($99/年),憑證有效 1 年,且可用 TestFlight 給家人。

---

## Phase 2:Hybrid 靜態打包(可選,離線優化)

> **何時做這個 phase:** 當你發現 (a) 行動網路不穩時 app 卡頓、(b) Vercel 流量超預算、或 (c) 想要更快的啟動速度。否則跳過。

**改動方向:** 把前端 `output: 'export'` 打進 Capacitor bundle,API 仍走 Vercel。

### Task 2.1:啟用 Next.js static export

**Files:**
- 修改:`next.config.ts`
- 修改:多個 page(把 SSR 元件改成 client-only)

- [ ] **Step 1:檢查哪些 page 還沒有 `"use client"`**

```bash
find app -name "page.tsx" -o -name "layout.tsx" | xargs grep -L '"use client"' | grep -v node_modules
```

每個列出的檔案都需要評估:
- 純 layout/含 metadata → 保留 server component(static export 支援)
- 含資料抓取 / state → 加 `"use client"`

- [ ] **Step 2:修改 `next.config.ts`**

```typescript
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};
```

> ⚠️ 加上 `output: "export"` 後 **API routes 不會被 build**。需要把 Vercel 那邊的部署當成 API server 繼續運作(分兩個 build target),或把 web 部署改成另一個 branch。

- [ ] **Step 3:把所有 client API 呼叫改成絕對 URL**

新建 `lib/api-base.ts`:
```typescript
import { Capacitor } from "@capacitor/core";

export const API_BASE = Capacitor.isNativePlatform()
  ? "https://japan-travel-expense.vercel.app"
  : "";

export const apiUrl = (path: string) => `${API_BASE}${path}`;
```

把所有 `fetch("/api/...")` 改成 `fetch(apiUrl("/api/..."))`(36 處,可用編輯器全域取代)。

- [ ] **Step 4:Vercel CORS 設定**

新建或修改 `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "capacitor://localhost" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" },
        { "key": "Access-Control-Allow-Credentials", "value": "true" }
      ]
    }
  ]
}
```

- [ ] **Step 5:本地驗證 static export**

```bash
npm run build
ls out/  # 應有 index.html、各 route 的 html
```

- [ ] **Step 6:Commit**

```bash
git add next.config.ts vercel.json lib/api-base.ts
git add $(git diff --name-only | grep -E "\.(ts|tsx)$")
git commit -m "feat: enable static export for capacitor bundle"
```

### Task 2.2:把 webDir 改成真實 build 產物

**Files:**
- 修改:`capacitor.config.ts`

- [ ] **Step 1:移除 server.url(讓 Capacitor 載 local bundle)**

```typescript
const config: CapacitorConfig = {
  appId: "com.jasonchen.ryocho",
  appName: "旅帳",
  webDir: "out",
  // server: {} ← 移除
  ios: { contentInset: "automatic" },
};
```

- [ ] **Step 2:Build & sync**

```bash
npm run build
npx cap sync ios
npx cap open ios
```

- [ ] **Step 3:Run 測試,確認所有 page 都能載入(離線也能開 app)**

- [ ] **Step 4:Commit**

```bash
git add capacitor.config.ts
git commit -m "feat(ios): switch to local bundle (offline-capable)"
```

### Task 2.3:處理 Service Worker 衝突

**Files:**
- 修改:`components/layout/sw-register.tsx`
- 或修改:`public/sw.js`

- [ ] **Step 1:在 native 環境跳過 SW 註冊**

```typescript
"use client";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function SwRegister() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
```

> SW 在 Capacitor WebView 裡會跟 native cache 衝突,且 `start_url` 在 `capacitor://localhost` 下行為怪異。

- [ ] **Step 2:Commit**

```bash
git add components/layout/sw-register.tsx
git commit -m "fix(ios): skip service worker in native webview"
```

---

## Phase 3:App Store 上架(可選,$99/年)

> **何時做這個 phase:** 想正式發佈、給朋友家人裝、不想再 7 天重簽。

### Task 3.1:加入 Apple Developer Program

- [ ] 到 https://developer.apple.com/programs/ 註冊($99/年)
- [ ] 等待 1–2 個工作天審核
- [ ] 在 Xcode → Settings → Accounts 重新登入(Team 會出現「Jason Chen (Individual)」)

### Task 3.2:準備 App Store metadata

**Files:** 無(在 App Store Connect 後台)

- [ ] **Step 1:準備素材**
- App icon 1024×1024(已有 `public/icon-512.png`,需放大 2x)
- 截圖:6.7" 必填(iPhone 15 Pro Max),5.5" 選填
- App Privacy 問卷(會收什麼資料、怎麼用)
- 隱私權政策 URL(至少要一頁靜態網頁)

- [ ] **Step 2:在 App Store Connect 建立 app**
- Bundle ID 與 Xcode 一致
- SKU 任意填(內部代號)
- Primary Language:繁體中文

### Task 3.3:處理 Apple 4.2「不只是套殼網站」風險

> 純 WebView 套殼很高機率會被以 4.2 (Minimum Functionality) 退件。需要提供原生差異點。

可選做法(擇一即可):
- ☐ **Local Push Notifications**(消費新增提醒)
- ☐ **Native Camera UI** for OCR(用 `@capacitor/camera` 取代 web `<input>`)
- ☐ **iOS Widget**(顯示當前行程花費)
- ☐ **Siri Shortcut**(快速新增消費)

任挑一個實作,文案上說明「為什麼這個 app 比 Safari 體驗好」。

### Task 3.4:Archive & 提交審核

- [ ] **Step 1:Xcode → Product → Archive**
- [ ] **Step 2:Distribute App → App Store Connect → Upload**
- [ ] **Step 3:在 App Store Connect 填完 metadata → Submit for Review**
- [ ] **Step 4:等 1–7 天審核**

---

## 設定值參考(填空欄)

執行 plan 前先確認下列資訊:

| 項目 | 值 |
|------|-----|
| Vercel production URL | `https://japan-travel-expense.vercel.app`(待確認) |
| Bundle Identifier | `com.jasonchen.ryocho`(可改) |
| App 名稱(SpringBoard 顯示) | `旅帳` |
| Deep link scheme | `ryocho` |
| Apple Team(免費) | `Personal Team (Jason Chen)` |
| Supabase Auth Redirect URLs | `ryocho://auth/callback`、`https://<vercel>/auth/callback` |

---

## 風險清單

| 風險 | 機率 | 影響 | 對策 |
|------|------|------|------|
| Google OAuth 在 WebView 被擋 | 高 | 無法登入 | Task 1.4 用 system browser + deep link |
| 7 天免費憑證過期忘記重簽 | 高 | App 開不了 | 文件化提醒、必要時升級 $99 |
| App Store 4.2 退件 | 中 | 無法上架 | Phase 3.3 加原生功能差異化 |
| `output: "export"` 後 SSR page 壞掉 | 中 | 部分 page 白屏 | 逐一加 `"use client"` |
| Service Worker 跟 Capacitor cache 衝突 | 低 | 資料不更新 | Task 2.3 native 環境跳過 SW |
| Capacitor WebView 內 `html-to-image` 失敗 | 低 | 匯出按鈕壞 | Task 1.5 走 native filesystem + share |

---

## 完成標準

- **Phase 1 done(MVP):** iPhone 上點 app icon → 看到旅帳首頁 → guest mode 走完一輪記帳流程不崩
- **Phase 2 done:** 飛航模式下還能開 app、看舊資料(雖然 API 不能打)
- **Phase 3 done:** App Store 搜尋「旅帳」找得到、能下載
