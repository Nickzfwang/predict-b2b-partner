# Next.js 開發規則

## 版本

- Next.js **15**（App Router，非 Pages Router）
- React **19**
- TypeScript **5**（`strict: true`）

## App Router 規範

- 所有頁面使用 Server Component（預設），需要互動才加 `'use client'`
- `'use client'` 邊界盡量往葉節點推，減少 client bundle 大小
- API Routes 放在 `app/api/*/route.ts`，使用 `NextRequest` / `NextResponse`
- Layout 在 `app/layout.tsx`，共用 UI（Navbar 等）放這裡

## 安全規則（最重要）

- `PM_API_SECRET` 沒有 `NEXT_PUBLIC_` 前綴 → **絕對不能在 Client Component 使用**
- `lib/predict-markets.ts` 只能在 Server Component 或 API Route 內 import
- embed-token 必須由 server 產生，透過 props 傳給 client

```typescript
// ✅ 正確：在 Server Component 取得 token，傳給 Client
// app/page.tsx (Server Component)
const { embed_token } = await getEmbedToken(userId);
return <MarketWidget token={embed_token} />;

// ❌ 錯誤：在 Client Component 直接呼叫 API
// 'use client'
// const res = await fetch('/api/embed-token'); // 這樣還 ok，但不能直接帶 secret
```

## 路由結構

| 路徑 | 類型 | 說明 |
|------|------|------|
| `/` | Server Component | 首頁：文章列表 + 市場 Widget |
| `/articles/[id]` | Server Component | 文章頁 + Trade Panel |
| `/portfolio` | Server Component | 投資組合頁 |
| `/api/embed-token` | API Route (POST) | 產生 embed JWT |
| `/api/markets` | API Route (GET) | Proxy 市場列表 |
| `/api/webhook` | API Route (POST) | 接收 PM webhook |

## 資料獲取

- Server Component 直接呼叫 `lib/predict-markets.ts` 函式（不走 fetch API）
- Client Component 透過 `app/api/` 路由獲取資料（fetch to own API routes）
- 不使用 SWR 或 React Query（Demo 用途，保持簡單）

## 元件規範

- Props 用 TypeScript `interface` 定義，命名加 `Props` 後綴
- 所有有資料獲取的元件處理 loading / error / empty 三種狀態
- 禁止使用 `any`，用 `unknown` + type narrowing

## 環境變數

```
# Server-only（無 NEXT_PUBLIC_ 前綴）
PM_API_KEY=
PM_API_SECRET=
PM_BASE_URL=

# Client-accessible
NEXT_PUBLIC_PM_EMBED_BASE_URL=
NEXT_PUBLIC_DEMO_USERS=alice,bob,carol
```
