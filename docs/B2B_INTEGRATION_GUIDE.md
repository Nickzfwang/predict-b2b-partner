# B2B 預測市場串接指南

> 本文件說明如何以 B2B 商戶身份串接 PredictMarket 預測市場平台，涵蓋完整的 API 端點、SDK 嵌入、錢包模式及營運功能。

---

## 目錄

- [對接流程總覽](#對接流程總覽)
- [環境準備](#環境準備)
- [認證機制（HMAC-SHA256）](#認證機制hmac-sha256)
- [SDK 嵌入](#sdk-嵌入)
- [REST API 端點](#rest-api-端點)
- [錢包模式](#錢包模式)
- [Webhook 事件](#webhook-事件)
- [白標品牌設定](#白標品牌設定)
- [營運功能](#營運功能)
- [對接難度評估](#對接難度評估)
- [Demo 專案結構](#demo-專案結構)

---

## 對接流程總覽

```
Phase 1｜準備（1 天）
  ├─ 取得 API Key + Secret
  ├─ 設定環境變數（PM_API_KEY, PM_API_SECRET, PM_BASE_URL）
  └─ 取得 embed base URL（SDK script 位置）

Phase 2｜基礎串接（2-3 天）
  ├─ 實作 HMAC-SHA256 簽名
  ├─ POST /users/sync → 同步用戶
  ├─ POST /auth/embed-token → 產生 JWT
  └─ PredictMarket.init() → 嵌入市場 Widget

Phase 3｜交易功能（1-2 天）
  ├─ 選擇錢包模式（Transfer 或 Seamless）
  ├─ Transfer：用戶餘額由 PM 管理，較簡單
  └─ Seamless：需實作 callback endpoint，較彈性

Phase 4｜營運功能（2-3 天）
  ├─ Webhook 接收交易通知
  ├─ 對帳報表串接
  ├─ 保證金帳戶監控
  └─ 白標品牌設定

Phase 5｜上線（1 天）
  ├─ 切換正式 API 憑證
  └─ 驗證全流程
```

---

## 環境準備

### 環境變數

```bash
# Server-only（不可暴露給前端）
PM_API_KEY=pk_test_your_key          # API Key
PM_API_SECRET=sk_test_your_secret    # API Secret（簽名用）
PM_BASE_URL=http://localhost:8000    # PredictMarket API 基底 URL

# Seamless 模式專用（選用）
PM_SEAMLESS_API_KEY=pk_seamless_key
PM_SEAMLESS_API_SECRET=sk_seamless_secret

# Client-accessible
NEXT_PUBLIC_PM_EMBED_BASE_URL=http://localhost:5173/embed  # Embed 前端 URL
NEXT_PUBLIC_DEMO_USERS=alice,bob,carol                     # Demo 用戶列表
```

### API Base URL

所有 B2B API 端點的 base path：

```
{PM_BASE_URL}/api/v1/b2b
```

---

## 認證機制（HMAC-SHA256）

所有呼叫 PredictMarket API 的請求必須攜帶三個 Header：

```
X-API-Key: {PM_API_KEY}
X-Timestamp: {UNIX timestamp in seconds}
X-Signature: {HMAC-SHA256 hex digest}
```

### 簽名字串格式

```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{SHA256(BODY)}
```

| 項目 | 說明 |
|------|------|
| `METHOD` | HTTP 方法大寫（`GET`, `POST`, `PUT`, `DELETE`） |
| `PATH` | 不含 host 和 query string（如 `/api/v1/b2b/markets`） |
| `TIMESTAMP` | Unix timestamp（秒），5 分鐘內有效 |
| `SHA256(BODY)` | Request body 的 SHA256 hash；GET/DELETE 無 body 時對空字串做 hash |

### 範例（TypeScript）

```typescript
import crypto from 'crypto';

function createSignature(method: string, path: string, body: string): {
  timestamp: string;
  signature: string;
} {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const signatureString = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = crypto
    .createHmac('sha256', PM_API_SECRET)
    .update(signatureString)
    .digest('hex');

  return { timestamp, signature };
}
```

### 注意事項

- 同一個 signature **5 分鐘內不可重複使用**（防重放攻擊）
- `PM_API_SECRET` **絕對不能**在前端/Client-side 使用
- Multipart 請求（如 Logo 上傳）的 body hash 使用 `SHA256('')`（空字串 hash）

---

## SDK 嵌入

### 載入 SDK

```html
<script src="{EMBED_BASE_URL_WITHOUT_/embed}/sdk/predict-market-sdk.js"></script>
```

例如：`http://localhost:5173/sdk/predict-market-sdk.js`

### 最快上線（3 步驟）

```typescript
// 1. Server 端：同步用戶 + 取得 token
const user = await pmClient.post('/users/sync', {
  external_user_id: 'user_123',
  initial_balance: 10000
});
const { embed_token } = await pmClient.post('/auth/embed-token', {
  external_user_id: 'user_123'
});

// 2. Client 端：載入 SDK
// <script src="https://pm-platform.com/sdk/predict-market-sdk.js"></script>

// 3. Client 端：初始化 Widget
const widget = PredictMarket.init({
  container: '#widget',    // DOM 容器（selector 或 Element）
  token: embed_token       // Server 端產生的 JWT
});
```

### init() 完整參數

```typescript
const widget = PredictMarket.init({
  // 必填
  container: '#widget',              // DOM 容器
  token: 'jwt_token_here',          // embed JWT

  // 選填 — 路由
  route: '/markets',                 // 預設路由（/markets, /portfolio, /markets/{id}）

  // 選填 — 外觀
  baseUrl: 'http://localhost:5173/embed',  // Embed 前端 URL
  compact: false,                    // 精簡模式（縮小 padding、隱藏 nav）
  hideHeader: false,                 // 隱藏 header
  hideFooter: false,                 // 隱藏 footer
  locale: 'zh-TW',                   // 語系

  // 選填 — 主題色彩
  theme: {
    primaryColor: '#10B981',         // 主色
    secondaryColor: '#3B82F6',       // 輔助色
    backgroundColor: '#FFFFFF',      // 背景色
    textColor: '#1E293B',            // 文字色
    borderRadius: '0.5rem',          // 圓角
    fontFamily: 'Inter, sans-serif'  // 字型
  },

  // 選填 — Token 自動刷新
  onTokenRefresh: async () => {
    const res = await fetch('/api/embed-token', { method: 'POST' });
    const data = await res.json();
    return data.token;               // 回傳新 token
  },

  // 選填 — 事件監聽
  on: {
    'trade.completed': (data) => {
      console.log('交易完成', data.marketId, data.outcome, data.amount);
    },
    'resize': (data) => {
      console.log('iframe 高度變化', data.height);
    },
    'navigation': (data) => {
      console.log('頁面導航', data.path);
    },
    'auth_required': (data) => {
      console.log('需要重新認證', data.reason);
    },
    'error': (data) => {
      console.error('SDK 錯誤', data);
    }
  }
});
```

### Widget 方法

```typescript
// 導航到指定路由
widget.navigate('/portfolio');
widget.navigate('/markets/market_123');

// 動態切換主題（即時生效，無需重載）
widget.setTheme({
  primaryColor: '#FF0000',
  backgroundColor: '#1a1a2e',
  textColor: '#ffffff'
});

// 銷毀 Widget（移除 iframe、清理事件）
widget.destroy();
```

### iframe URL 格式

SDK 會自動組合 iframe src：

```
{baseUrl}{route}?token={token}&compact=1&hide_header=1&hide_footer=1&primary_color=%23FF0000...
```

### 功能特性

| 功能 | 說明 |
|------|------|
| **Auto-Resize** | iframe 高度自動跟隨內容調整 |
| **Token Refresh** | token 到期前自動呼叫 `onTokenRefresh` 取得新 token |
| **多實例** | 可在不同 container 同時初始化多個 widget |
| **Destroy 安全** | destroy 後再呼叫方法只會 console.warn，不會 throw |

---

## REST API 端點

### 認證 & Token

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/auth/embed-token` | 產生 iframe 嵌入用 JWT |

**Request:**
```json
{
  "external_user_id": "user_123",
  "ttl": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": { "embed_token": "eyJhbG..." }
}
```

### 用戶管理

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/users/sync` | 建立/同步用戶（帶初始餘額） |
| `GET` | `/users/{externalUserId}` | 查詢用戶資料與餘額 |

**Sync Request:**
```json
{
  "external_user_id": "user_123",
  "display_name": "Alice",
  "initial_balance": 10000
}
```

### 市場

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/markets` | 市場列表（支援分頁與篩選） |
| `GET` | `/markets/{id}` | 單一市場詳情 |
| `GET` | `/markets/{id}/trades` | 市場交易紀錄 |
| `GET` | `/markets/{id}/price-history` | 價格歷史（圖表用） |

**Query Parameters:**
```
?page=1&per_page=20&status=open&category=sports
```

**Market Response:**
```json
{
  "id": "market_abc",
  "title": "2026 世界盃冠軍是巴西嗎？",
  "yes_price": 0.65,
  "no_price": 0.35,
  "status": "open",
  "volume": 50000,
  "closes_at": "2026-12-31T23:59:59Z"
}
```

### 交易

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/trades` | 下單買入/賣出 |
| `GET` | `/trades` | 用戶交易歷史 |

**Trade Request:**
```json
{
  "external_user_id": "user_123",
  "market_id": "market_abc",
  "outcome": "yes",
  "amount": 100,
  "action": "buy"
}
```

### 持倉

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/positions` | 用戶持倉列表 |

**Query:** `?external_user_id=user_123`

### 數據分析

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/analytics/overview` | 商戶總覽（用戶數、交易量、費率限制） |
| `GET` | `/analytics/daily` | 每日交易統計 |
| `GET` | `/analytics/earnings` | 收益分析明細 |

---

## 錢包模式

PredictMarket 支援兩種錢包模式：

### Transfer 模式（推薦入門）

用戶餘額由 PredictMarket 管理，商戶只需同步用戶。

```
商戶                    PredictMarket
  │                          │
  ├── POST /users/sync ─────→│  建立用戶 + 初始餘額
  │                          │
  ├── POST /trades ─────────→│  下單（PM 直接扣款）
  │                          │
  ├── GET /users/{id} ──────→│  查詢餘額
  │                          │
```

- **優點：** 實作簡單，無需自建錢包系統
- **適用場景：** 快速上線、Demo、輕量整合
- **用戶 ID 前綴：** `demo_`（Demo 環境）

### Seamless 模式（進階）

用戶餘額由商戶管理，PM 透過 callback 即時查詢/扣款。

```
商戶                    PredictMarket
  │                          │
  ├── PUT /wallet/config ───→│  設定 callback URL
  │                          │
  │  用戶下單時：              │
  │                          │
  │←── getBalance callback ──│  查詢餘額
  │── { balance: 5000 } ───→│
  │                          │
  │←── debit callback ──────│  扣款
  │── { success: true } ───→│
  │                          │
  │  結算/退款時：             │
  │                          │
  │←── credit callback ─────│  入帳
  │── { success: true } ───→│
  │                          │
  │←── rollback callback ───│  回滾（交易失敗時）
  │── { success: true } ───→│
```

- **優點：** 餘額完全由商戶控制，可整合既有金流系統
- **適用場景：** 大型平台、需要統一帳戶管理
- **Callback Actions：** `getBalance`, `debit`, `credit`, `rollback`
- **用戶 ID 前綴：** `demo_seamless_`（Demo 環境）

### Callback 驗簽

PM 呼叫 callback 時會帶 HMAC 簽名，商戶端需驗證：

```typescript
// 驗證 callback 請求的簽名
const signature = req.headers['x-signature'];
const timestamp = req.headers['x-timestamp'];
const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
const expected = crypto
  .createHmac('sha256', PM_SEAMLESS_API_SECRET)
  .update(`POST\n/api/seamless-callback\n${timestamp}\n${bodyHash}`)
  .digest('hex');

if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

---

## Webhook 事件

### 註冊 Webhook

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/webhooks` | 註冊 webhook 訂閱 |
| `GET` | `/webhooks` | 列出所有訂閱 |
| `PUT` | `/webhooks/{id}` | 更新 webhook |
| `DELETE` | `/webhooks/{id}` | 刪除 webhook |

**Register Request:**
```json
{
  "url": "https://your-site.com/api/webhook",
  "events": ["trade.created", "user.balance_changed", "position.settled"]
}
```

**Response（一次性回傳 webhook_secret）：**
```json
{
  "success": true,
  "data": {
    "id": "wh_abc",
    "webhook_secret": "whsec_xxxxx"
  }
}
```

### 支援的事件

| 事件 | 觸發時機 | Payload 範例 |
|------|---------|-------------|
| `trade.created` | 用戶下單成功 | `{ marketId, outcome, amount, price }` |
| `user.balance_changed` | 餘額變動 | `{ userId, oldBalance, newBalance }` |
| `position.settled` | 市場結算 | `{ marketId, outcome, payout }` |

### 驗簽

```typescript
import crypto from 'crypto';

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

- 使用 `timingSafeEqual` 防止 timing attack
- 驗簽失敗應回傳 `401`
- 支援新格式：`HMAC-SHA256({webhook_id}.{timestamp}.{raw_body})`

---

## 白標品牌設定

### Logo 上傳

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/branding/logo` | 上傳品牌 Logo |

```bash
curl -X POST /api/v1/b2b/branding/logo \
  -H "X-API-Key: {key}" \
  -H "X-Timestamp: {ts}" \
  -H "X-Signature: {sig}" \
  -F "logo=@logo.png"
```

**限制：**
- 檔案大小：最大 2MB
- 支援格式：PNG, JPG, SVG
- 重複上傳會取代舊檔案

**HMAC 注意：** multipart 請求的 body hash 使用 `SHA256('')`（空字串）

**錯誤碼：**
| 情境 | 錯誤碼 |
|------|--------|
| 檔案 > 2MB | `FILE_TOO_LARGE` |
| 不支援的格式 | `INVALID_FILE_TYPE` |
| 缺少 logo 欄位 | `VALIDATION_ERROR` |

### Theme 更新

| 方法 | 端點 | 說明 |
|------|------|------|
| `PUT` | `/branding/theme` | 更新主題色彩 |
| `GET` | `/branding` | 取得目前品牌設定 |

```json
// PUT /branding/theme
{
  "primary_color": "#FF5733",
  "secondary_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "text_color": "#1E293B",
  "border_radius": "0.5rem",
  "font_family": "Inter, sans-serif"
}
```

**特性：**
- **Merge 行為：** 只更新指定欄位，不覆蓋未傳入的欄位
- **3 位 hex 縮寫：** `#FFF` 可接受
- **XSS 防護：** `font_family` 含 `<script>` 會被拒絕
- **驗證規則：** 顏色必須為 hex 格式，`border_radius` 必須為有效 CSS 值

---

## 營運功能

### 保證金帳戶

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/deposit` | 查詢保證金餘額 |
| `GET` | `/deposit/transactions` | 交易明細（入金/出金/凍結/解凍） |
| `GET` | `/deposit/risk` | 風險警示等級（yellow/orange/red） |

### T+1 對帳報表

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/reconciliation/{date}` | 指定日期的對帳報表 |

**Response 包含：**
- 交易摘要（總筆數、總金額）
- 手續費明細
- 結算金額
- 差異偵測（discrepancies）

### 數據分析

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/analytics/overview` | 商戶 KPI（總用戶、交易量、費率限制） |
| `GET` | `/analytics/daily` | 每日交易與成交量統計 |
| `GET` | `/analytics/earnings` | 收益分析明細 |

---

## 對接難度評估

### 整體難度：⭐⭐ 中低

| 項目 | 難度 | 預估時間 | 說明 |
|------|------|---------|------|
| SDK 嵌入 | ⭐ 低 | 半天 | 載入 script → `init()` → 完成 |
| HMAC 簽名 | ⭐⭐ 中 | 1 天 | 需理解簽名格式，有範例可參考 |
| Transfer 錢包 | ⭐ 低 | 半天 | PM 管理餘額，商戶只需 sync 用戶 |
| Seamless 錢包 | ⭐⭐⭐ 中高 | 2-3 天 | 需實作 callback（getBalance/debit/credit/rollback） |
| Webhook 驗簽 | ⭐⭐ 中 | 半天 | HMAC 驗證 + timing-safe 比較 |
| 白標品牌 | ⭐ 低 | 半天 | 上傳 Logo + 設定顏色 |
| 對帳系統 | ⭐⭐ 中 | 1 天 | 串接報表 API + 呈現 |

### 最快上線路徑（MVP）

若只需基礎功能，**一個工程師 2-3 天**即可完成：

1. ✅ 實作 HMAC 簽名
2. ✅ 同步用戶（`/users/sync`）
3. ✅ 產生 embed token（`/auth/embed-token`）
4. ✅ 載入 SDK 並 `PredictMarket.init()`

### 完整功能

含 Seamless 錢包、Webhook、對帳、品牌設定，約 **1-2 週**。

---

## Demo 專案結構

本 Demo 專案（b2b-partner）的目錄結構：

```
b2b-partner/
├── app/
│   ├── api/                          # Server-side API Routes（HMAC 在此執行）
│   │   ├── embed-token/route.ts      # POST → 產生 embed JWT
│   │   ├── markets/route.ts          # GET → proxy 市場列表
│   │   ├── trades/route.ts           # POST/GET → 交易操作
│   │   ├── positions/route.ts        # GET → 持倉查詢
│   │   ├── branding/
│   │   │   ├── logo/route.ts         # POST → Logo 上傳
│   │   │   └── theme/route.ts        # PUT → Theme 更新
│   │   ├── deposit/
│   │   │   ├── account/route.ts      # GET → 保證金餘額
│   │   │   ├── transactions/route.ts # GET → 交易明細
│   │   │   └── risk/route.ts         # GET → 風險警示
│   │   ├── analytics/
│   │   │   ├── overview/route.ts     # GET → 商戶 KPI
│   │   │   └── daily/route.ts        # GET → 每日統計
│   │   ├── reconciliation/
│   │   │   └── [date]/route.ts       # GET → T+1 對帳
│   │   ├── wallet-config/route.ts    # PUT → Seamless 設定
│   │   ├── seamless-callback/route.ts# POST → Seamless callback
│   │   └── webhook/
│   │       ├── route.ts              # POST → 接收 webhook 推送
│   │       ├── register/route.ts     # POST → 註冊 webhook
│   │       └── subscriptions/route.ts# GET → 列出訂閱
│   ├── articles/[id]/page.tsx        # 文章頁 + Trade Panel embed
│   ├── portfolio/page.tsx            # 投資組合頁
│   ├── trades/page.tsx               # 交易頁
│   ├── wallet/page.tsx               # 錢包頁
│   ├── deposit/page.tsx              # 保證金帳戶頁
│   ├── reconciliation/page.tsx       # 對帳報表頁
│   ├── branding/page.tsx             # 白標品牌設定頁
│   ├── layout.tsx                    # 共用 Layout + Navbar
│   └── page.tsx                      # 首頁：文章列表 + 市場 Widget
├── components/
│   └── EmbedWidget.tsx               # SDK Widget React 封裝
├── lib/
│   ├── predict-markets.ts            # HMAC 簽名 client + 型別定義
│   ├── wallet-mode.ts                # 雙錢包模式切換
│   └── get-pm-client.ts              # Client 工廠
├── data/
│   └── articles.ts                   # Mock 文章資料
└── .env.local                        # 環境變數
```

---

## 錯誤處理

PredictMarket API 錯誤格式：

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_ERROR",
    "message": "Insufficient balance"
  }
}
```

常見錯誤碼：

| 錯誤碼 | 說明 |
|--------|------|
| `INVALID_SIGNATURE` | HMAC 簽名驗證失敗 |
| `SIGNATURE_EXPIRED` | 簽名已過期（超過 5 分鐘） |
| `INSUFFICIENT_BALANCE` | 餘額不足 |
| `MARKET_CLOSED` | 市場已關閉 |
| `VALIDATION_ERROR` | 請求參數驗證失敗 |
| `FILE_TOO_LARGE` | 上傳檔案超過大小限制 |
| `INVALID_FILE_TYPE` | 不支援的檔案格式 |

**最佳實踐：** API Route 應將 PM 的錯誤適當轉換後回傳給前端，不直接暴露內部錯誤細節。

---

## 安全注意事項

1. **`PM_API_SECRET` 絕對不能在 Client-side 使用** — 沒有 `NEXT_PUBLIC_` 前綴
2. **embed-token 必須由 Server 端產生** — 透過 props 傳給 Client Component
3. **Webhook 驗簽使用 `timingSafeEqual`** — 防止 timing attack
4. **Seamless callback 需驗證來源簽名** — 確認請求來自 PM

---

## 相關文件

- [QUICK_START.md](../PredictMarket/docs/partner-integration/QUICK_START.md) — 快速入門
- [AUTHENTICATION.md](../PredictMarket/docs/partner-integration/AUTHENTICATION.md) — HMAC 認證詳細說明
- [API_REFERENCE.md](../PredictMarket/docs/partner-integration/API_REFERENCE.md) — 完整 API 端點文件
- [SDK_GUIDE.md](../PredictMarket/docs/partner-integration/SDK_GUIDE.md) — JavaScript SDK 用法
- [IFRAME_EMBED.md](../PredictMarket/docs/partner-integration/IFRAME_EMBED.md) — iframe 嵌入指南
- [WEBHOOK.md](../PredictMarket/docs/partner-integration/WEBHOOK.md) — Webhook 事件與驗簽
