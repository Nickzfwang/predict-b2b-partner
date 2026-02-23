# b2b-partner — 預測市場 B2B 串接 Demo

## 專案定位

這是一個模擬「財經新聞媒體平台」串接 [predict-markets](../predict-markets) B2B API 的 Demo 產品。
用來展示 Partner 如何透過 REST API、iframe Embed、JavaScript SDK 將預測市場整合進自己的產品。

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS 4 |
| **Runtime** | Node.js 20+ |
| **Database** | 無（無狀態，資料全由 predict-markets 管理） |

## 專案結構

```
b2b-partner/
├── app/
│   ├── api/                      # Server-side API Routes（HMAC 在此執行）
│   │   ├── embed-token/route.ts  # POST → 呼叫 PM /auth/embed-token
│   │   ├── markets/route.ts      # GET → proxy PM /markets
│   │   └── webhook/route.ts      # POST → 接收 PM webhook 推送
│   ├── articles/[id]/page.tsx    # 文章頁 + Trade Panel embed
│   ├── portfolio/page.tsx        # 投資組合頁
│   ├── layout.tsx
│   └── page.tsx                  # 首頁：文章列表 + 市場 Widget
├── lib/
│   └── predict-markets.ts        # HMAC 簽名 client（Server-side only）
├── data/
│   └── articles.ts               # Mock 文章資料（靜態）
└── .env.local                    # PM_API_KEY, PM_API_SECRET, PM_BASE_URL
```

## 環境變數

```bash
# predict-markets B2B API 憑證
PM_API_KEY=pk_test_your_key
PM_API_SECRET=sk_test_your_secret
PM_BASE_URL=http://localhost:8000

# Demo 用戶（用 ?user=alice 切換）
NEXT_PUBLIC_DEMO_USERS=alice,bob,carol
```

## 重要設計原則

### 1. HMAC 簽名只能在 Server-side 執行
- `lib/predict-markets.ts` 只能在 API Routes / Server Components 內 import
- `PM_API_SECRET` 沒有 `NEXT_PUBLIC_` 前綴，不會進入 browser bundle
- 所有呼叫 predict-markets API 的邏輯都經過 `app/api/` 中轉

### 2. 無狀態設計
- 不使用資料庫
- 用戶身份透過 URL query string `?user=alice` 模擬（Demo 用）
- 用戶資料（餘額、持倉）全部從 predict-markets API 讀取

### 3. Demo 用戶初始化流程
```
1. 用戶訪問頁面（?user=alice）
2. Server Component 呼叫 POST /users/sync（帶 initial_balance）
3. 取得 embed-token，傳給 Client Component
4. Client Component 用 token 渲染 iframe SDK
```

## 串接方式對照

| 功能 | 使用方式 | 位置 |
|------|---------|------|
| 取得市場列表 | REST API | `app/api/markets/route.ts` |
| 嵌入市場列表 | iframe SDK `renderMarketList` | `app/page.tsx` |
| 嵌入交易面板 | iframe SDK `renderTradePanel` | `app/articles/[id]/page.tsx` |
| 嵌入投資組合 | iframe SDK `renderPortfolio` | `app/portfolio/page.tsx` |
| 接收交易通知 | Webhook `trade.created` | `app/api/webhook/route.ts` |

## Common Commands

```bash
npm run dev       # 開發伺服器 (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript 型別檢查
```

## 對接的 predict-markets API

- **Base URL**: `PM_BASE_URL/api/v1/b2b`
- **認證**: API Key + HMAC-SHA256（見 `lib/predict-markets.ts`）
- **文件**: `../predict-markets/docs/partner-integration/`

## 語言偏好

- 對話使用繁體中文
- 程式碼、型別名稱、技術術語用英文
- Git commit message 用英文
