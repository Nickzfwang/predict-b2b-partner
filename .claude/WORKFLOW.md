# AI 工作流程指南

## 設定總覽

```
.claude/
├── rules/          ← 3 份規則（自動載入，約束所有行為）
│   ├── nextjs.md                     # Next.js 15 App Router 規範
│   ├── typescript.md                 # TypeScript strict 規範
│   └── predict-markets-integration.md # PM API 串接規則
├── agents/         ← 3 個專業 Agent（用 @agent-name 呼叫）
│   ├── pm-integration.md             # PM 串接專家
│   ├── api-route-dev.md              # API Route 開發
│   └── nextjs-frontend.md            # 前端頁面開發
├── skills/         ← 5 個 Skill（用 /skill-name 呼叫）
│   ├── /code-review                  # 程式碼審查
│   ├── /test-integration             # API 串接測試
│   ├── /add-api-route                # 新增 API 端點
│   ├── /add-page                     # 新增頁面
│   └── /debug                        # 系統化除錯
├── hooks/          ← 自動化鉤子
│   └── lint-after-edit.sh            # 編輯 .ts/.tsx 後自動檢查
└── settings.json   ← 權限 allow/deny list
```

---

## 需求開發流程

以「新增排行榜頁面」為例：

```
Phase 1: 需求釐清
│  直接對話，確認：
│  • 資料來源 → PM 有沒有對應 API？
│  • 頁面類型 → 嵌入 SDK 還是自己拉 API 渲染？
│  • 是否需要登入（demo user）？
▼
Phase 2: 查閱 PM API 規格
│  呼叫 Agent：@pm-integration
│  「查看 PM 是否有 leaderboard API 端點」
│  → 確認 request/response 格式
▼
Phase 3: 建立 API Route
│  呼叫 Skill：/add-api-route GET /leaderboard
│  自動完成：
│  ① lib/predict-markets.ts → 新增型別 + client 方法
│  ② app/api/leaderboard/route.ts → API Route
│  ③ curl 測試端點
│  ⚡ Hook 自動觸發：lint-after-edit.sh
▼
Phase 4: 建立前端頁面
│  呼叫 Skill：/add-page /leaderboard 排行榜
│  自動完成：
│  ① app/leaderboard/page.tsx → Server Component
│  ② components/LeaderboardTable.tsx（如需 client 互動）
│  ③ components/NavLinks.tsx → 加入導航連結
│  ⚡ Hook 自動觸發：lint-after-edit.sh
▼
Phase 5: 驗證
│  呼叫 Skill：/test-integration leaderboard
│  自動完成：
│  ① curl 測試 API 回應
│  ② Preview 截圖確認頁面渲染
│  ③ 輸出測試報告
▼
Phase 6: 程式碼審查
│  呼叫 Skill：/code-review
│  自動檢查：
│  🔴 Critical → secret 外洩？any 型別？XSS？
│  🟡 Warning  → loading/error 狀態？walletMode 支援？
│  🟢 Suggest  → 命名慣例？重複程式碼？
│  → 輸出結論：✅ 可合併 / ⚠️ 需修正
▼
Phase 7: Commit & Push
   「請幫我 commit push」
```

---

## 各場景對應指令

### Skills（用 `/` 呼叫）

| 指令 | 場景 | 說明 |
|------|------|------|
| `/add-api-route` | 新增 PM API 端點 | 引導式建立，含型別 + route + 測試 |
| `/add-page` | 新增頁面 | 支援 embed / api-data / form 三種類型 |
| `/test-integration` | 確認功能正常 | 一鍵測試所有 B2B API 端點 |
| `/code-review` | 提交前檢查 | 安全性 + 型別 + 風格三級審查 |
| `/debug` | 東西壞了 | 系統化排查：Network → Auth → HMAC → SDK |

### Agents（用 `@` 呼叫）

| 指令 | 場景 | 說明 |
|------|------|------|
| `@pm-integration` | 串接問題諮詢 | HMAC、Token、SDK、Webhook 疑難排解 |
| `@api-route-dev` | API 開發 | HMAC 簽名、錯誤處理、walletMode 範本 |
| `@nextjs-frontend` | 前端開發 | 元件、頁面、SDK 嵌入、Tailwind 樣式 |

---

## Rules 自動約束（始終生效）

無論做什麼操作，以下規則始終自動套用：

| 規則檔案 | 約束內容 |
|---------|---------|
| `nextjs.md` | `PM_API_SECRET` 絕不進 client、`'use client'` 盡量往葉節點推 |
| `typescript.md` | 禁止 `any`、命名慣例（PascalCase / camelCase / UPPER_SNAKE）、strict mode |
| `predict-markets-integration.md` | HMAC 簽名格式、demo user 前綴 `demo_`、API base URL `/api/v1/b2b` |

---

## Hook 自動行為

每次編輯 `.ts` / `.tsx` 檔案後自動執行：

```
編輯檔案 → tsc --noEmit（型別檢查）→ eslint（風格檢查）→ 有錯即時回報
```

---

## 常見工作範例

### 範例 1：串接新的 PM API

```
你：「PM 新增了 GET /analytics/earnings 端點，請串接」
→ /add-api-route GET /analytics/earnings
→ /test-integration
→ /code-review
→ 「請幫我 commit push」
```

### 範例 2：嵌入新的 SDK Widget

```
你：「在文章頁加入即時動態 feed」
→ @pm-integration 確認 SDK 是否支援 feed route
→ 修改 EmbedWidget 的 route 參數
→ /test-integration
→ 「請幫我 commit push」
```

### 範例 3：排查問題

```
你：「iframe 顯示空白」
→ /debug iframe 空白
→ 系統化排查 Network → Token → SDK → 輸出診斷報告
→ 修復後 /test-integration 驗證
```

### 範例 4：建立完整新功能頁

```
你：「新增一個設定頁面，讓用戶可以管理 webhook 訂閱」
→ @pm-integration 確認 webhook API 規格
→ /add-api-route GET /webhooks
→ /add-api-route POST /webhooks
→ /add-page /settings 設定
→ /code-review
→ 「請幫我 commit push」
```

### 範例 5：白標品牌調整

```
你：「調整 embed 主題為深色模式」
→ 修改 EmbedWidget theme 參數
→ /test-integration branding
→ Preview 截圖確認
→ 「請幫我 commit push」
```

---

## 權限控管

### ✅ 允許（自動通過）

- `npm run lint` / `npm run build` / `npx tsc --noEmit`
- `git status` / `git diff` / `git log` / `git add` / `git commit` / `git push`
- `curl` / `ls` / `mkdir`

### 🚫 禁止（永遠攔截）

- `git push --force` / `git push -f`
- `git reset --hard`
- `git clean -f`
- `git branch -D`
- `rm -rf`
