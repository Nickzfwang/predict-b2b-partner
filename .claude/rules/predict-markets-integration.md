# predict-markets B2B 串接規則

## 串接文件位置

所有 API 規格參考 `../predict-markets/docs/partner-integration/`：

| 文件 | 說明 |
|------|------|
| `QUICK_START.md` | 快速入門 |
| `AUTHENTICATION.md` | HMAC-SHA256 簽名算法 |
| `API_REFERENCE.md` | 完整 REST API 端點 |
| `IFRAME_EMBED.md` | iframe 嵌入指南 |
| `SDK_GUIDE.md` | JavaScript SDK 用法 |
| `WEBHOOK.md` | Webhook 事件與驗簽 |

## HMAC 簽名規則

所有呼叫 predict-markets API 的請求必須攜帶三個 Header：

```
X-API-Key: {PM_API_KEY}
X-Timestamp: {UNIX timestamp in seconds}
X-Signature: {HMAC-SHA256 hex digest}
```

簽名字串格式：
```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{SHA256(BODY)}
```

- GET / DELETE 無 body 時，對空字串做 SHA256
- PATH 不含 host 和 query string（`/api/v1/b2b/markets` 非完整 URL）
- 同一個 signature 5 分鐘內不可重複使用（防重放）

## lib/predict-markets.ts 使用規範

```typescript
// ✅ 正確用法（在 Server Component 或 API Route）
import { pmClient } from '@/lib/predict-markets';

const markets = await pmClient.get('/markets');
const token = await pmClient.post('/auth/embed-token', { external_user_id: userId });
```

- **絕對不能**在 Client Component 或 `'use client'` 檔案 import 此模組
- 每次呼叫自動產生新的 timestamp，不可複用

## Demo 用戶管理

```
URL 參數: ?user=alice
→ Server Component 讀取
→ 呼叫 POST /users/sync (external_user_id: "demo_alice")
→ 取得 embed-token
→ 傳給 Client Component 渲染 iframe
```

Demo 用戶的 `external_user_id` 加前綴 `demo_`（例：`demo_alice`）以區分 Demo 流量。

## iframe SDK 使用方式

SDK script 由 predict-markets 提供：
```html
<script src="{PM_BASE_URL}/sdk/predict-market-sdk.js"></script>
```

在 React 中透過 `useEffect` 載入（見 SDK_GUIDE.md React 範例）。

## Webhook 驗簽流程

接收 webhook 時必須驗證 `X-Webhook-Signature` header：

```
signature = HMAC-SHA256(webhook_secret, raw_body)
```

- `webhook_secret` 在建立 webhook 時由 predict-markets 回傳（一次性）
- 使用 `timingSafeEqual` 比較，防 timing attack
- 驗簽失敗回傳 `401`

## API Base URL

```
{PM_BASE_URL}/api/v1/b2b
```

開發環境：`PM_BASE_URL=http://localhost:8000`

## 錯誤處理

predict-markets API 錯誤格式：
```json
{
  "success": false,
  "error": { "code": "BUSINESS_ERROR", "message": "..." }
}
```

API Route 應將 PM 的錯誤適當轉換後回傳給前端，不直接暴露內部錯誤細節。
