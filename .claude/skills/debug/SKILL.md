---
name: debug
description: "除錯工作流 — 系統化排查 API 串接、SDK 嵌入、Webhook 問題"
---

# /debug

系統化排查問題，從症狀到根因。

## 使用方式

```
/debug                        # 互動式，描述問題症狀
/debug iframe 空白             # 直接描述問題
/debug HMAC 401               # 直接描述問題
```

## 排查流程

### Step 1: 分類問題

根據症狀判斷問題層級：

| 症狀 | 可能層級 |
|------|---------|
| iframe 空白 / 載入失敗 | SDK / Token / Network |
| API 回傳 401 | HMAC 簽名 |
| API 回傳 422 | Request 參數格式 |
| API 回傳 500 | PM 後端 |
| Theme 不生效 | SDK 參數 / PM embed 前端 |
| Webhook 沒收到 | 註冊 / URL / 驗簽 |
| 頁面 500 | Server Component / 環境變數 |

### Step 2: 依層級排查

#### 🔌 Network 層

```bash
# PM API 是否可達
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/b2b/markets

# PM embed 前端是否可達
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/embed/markets

# SDK script 是否可載入
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/sdk/predict-market-sdk.js
```

#### 🔑 認證層

```bash
# 檢查環境變數
echo "PM_API_KEY=${PM_API_KEY:-(not set)}"
echo "PM_BASE_URL=${PM_BASE_URL:-(not set)}"
# PM_API_SECRET 不印出值，只確認有設定
echo "PM_API_SECRET=${PM_API_SECRET:+is set}"
```

#### 🔐 HMAC 層

檢查 `lib/predict-markets.ts` 的 `buildSignature()` 函式：
- METHOD 是否大寫？
- PATH 是否包含 `/api/v1/b2b` 前綴？
- TIMESTAMP 是否為秒級（非毫秒）？
- BODY_HASH 對空字串的處理？

#### 🧩 SDK 層

使用 Preview 工具：
1. 截圖確認 iframe 是否出現
2. 檢查 console logs 有無錯誤
3. 檢查 network requests 的 iframe src URL

#### 📡 Webhook 層

```bash
# 列出已註冊的 webhook
curl -s "http://localhost:3000/api/webhook/subscriptions?mode=transfer" | python3 -m json.tool
```

### Step 3: 常見問題速查

| 問題 | 根因 | 解法 |
|------|------|------|
| `INVALID_SIGNATURE` | 簽名字串格式錯誤 | 檢查 `\n` 分隔的 4 段格式 |
| `SIGNATURE_EXPIRED` | 時間偏差 > 5 分鐘 | 檢查系統時間 |
| iframe `your-domain.com` | baseUrl 錯誤 | 檢查 `NEXT_PUBLIC_PM_EMBED_BASE_URL` |
| Token `401` in iframe | JWT 過期 | 檢查 `onTokenRefresh` callback |
| `.env.local` 變數未讀取 | 需重啟 dev server | `npm run dev` 重新啟動 |

### Step 4: 輸出診斷報告

```markdown
## Debug Report

### 症狀
{使用者描述的問題}

### 排查過程
1. {檢查步驟} → {結果}
2. {檢查步驟} → {結果}

### 根因
{問題原因}

### 解法
{修復步驟}

### 驗證
{確認修復的方法}
```
