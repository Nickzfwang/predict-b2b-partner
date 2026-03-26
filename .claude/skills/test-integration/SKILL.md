---
name: test-integration
description: "測試 PredictMarket B2B API 串接 — 驗證各端點是否正常運作"
---

# /test-integration

自動測試 PredictMarket B2B API 串接是否正常。

## 使用方式

```
/test-integration              # 測試所有端點
/test-integration markets      # 只測試市場相關
/test-integration branding     # 只測試白標品牌
/test-integration webhook      # 只測試 webhook
```

## 測試流程

### 前置確認

1. 確認 PredictMarket 服務是否運行：
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/b2b/markets
```

2. 確認 b2b-partner dev server 是否運行：
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### 測試項目

#### 1. 用戶同步 & Token

```bash
# POST /users/sync
curl -s http://localhost:3000/api/embed-token -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId":"alice"}' | python3 -m json.tool
```
- ✅ 預期：回傳 `embed_token`

#### 2. 市場列表

```bash
# GET /markets
curl -s "http://localhost:3000/api/markets?mode=transfer" | python3 -m json.tool
```
- ✅ 預期：回傳市場陣列

#### 3. 白標 Logo 上傳

```bash
# 建立測試圖片
convert -size 100x100 xc:red /tmp/test_logo.png 2>/dev/null || \
  python3 -c "
from PIL import Image
img = Image.new('RGB', (100, 100), 'red')
img.save('/tmp/test_logo.png')
" 2>/dev/null || \
  printf '\x89PNG\r\n\x1a\n' > /tmp/test_logo.png

# 上傳
curl -s -X POST "http://localhost:3000/api/branding/logo?mode=transfer" \
  -F "logo=@/tmp/test_logo.png;type=image/png" | python3 -m json.tool
```
- ✅ 預期：回傳 `logo_url`

#### 4. 白標 Theme 更新

```bash
curl -s -X PUT "http://localhost:3000/api/branding/theme?mode=transfer" \
  -H "Content-Type: application/json" \
  -d '{"primary_color":"#FF5733"}' | python3 -m json.tool
```
- ✅ 預期：回傳含 `primaryColor` 的 `theme_config`

#### 5. SDK Widget 載入

使用 Preview 工具截圖 `http://localhost:3000?user=alice`，確認：
- iframe 存在且顯示市場列表
- 無 console error

### 輸出報告

```markdown
## Integration Test Report

| # | 測試項目 | 狀態 | 回應碼 | 備註 |
|---|---------|------|--------|------|
| 1 | 用戶同步 & Token | ✅/❌ | 200 | |
| 2 | 市場列表 | ✅/❌ | 200 | |
| 3 | Logo 上傳 | ✅/❌ | 200 | |
| 4 | Theme 更新 | ✅/❌ | 200 | |
| 5 | SDK Widget | ✅/❌ | - | 截圖確認 |

通過率：N/5
```
