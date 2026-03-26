---
name: add-api-route
description: "新增 API Route — 快速建立串接 PredictMarket 的 API 端點"
---

# /add-api-route

引導式建立新的 API Route，自動處理 HMAC 簽名、型別定義、錯誤處理。

## 使用方式

```
/add-api-route                    # 互動式引導
/add-api-route GET /analytics/earnings  # 直接指定
```

## 工作流程

### Phase 1: 確認規格

詢問或從參數解析：
1. **HTTP Method** — GET / POST / PUT / DELETE
2. **PM API 端點** — 例如 `/analytics/earnings`
3. **本地路由路徑** — 例如 `app/api/analytics/earnings/route.ts`
4. **是否需要 request body** — POST/PUT 通常需要
5. **是否支援 walletMode** — 大部分都需要

### Phase 2: 查閱 PM API 文件

```bash
# 讀取 API 文件確認端點規格
cat ../PredictMarket/docs/partner-integration/API_REFERENCE.md
```

確認：
- Request 參數格式
- Response 資料結構
- 可能的 error codes

### Phase 3: 新增型別

在 `lib/predict-markets.ts` 中新增：

```typescript
// 1. Response 型別（在型別區塊）
export interface PM{Name}Response {
  // 依據 API 文件定義
}

// 2. Client 方法（在 createPMClient 內）
get{Name}() {
  return pmFetch<PM{Name}Response>(c, 'GET', '/endpoint');
},
```

### Phase 4: 建立 Route

在 `app/api/{path}/route.ts` 建立：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPMClient } from '@/lib/get-pm-client';

export async function GET(request: NextRequest) {
  try {
    const walletMode = request.nextUrl.searchParams.get('mode') ?? 'transfer';
    const pmClient = getPMClient(walletMode);
    const result = await pmClient.get{Name}();

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[{Name}] Error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch {name}' },
      { status: 500 }
    );
  }
}
```

### Phase 5: 驗證

```bash
# 測試新端點
curl -s "http://localhost:3000/api/{path}?mode=transfer" | python3 -m json.tool
```

### 輸出

```
✅ 已建立：
  - lib/predict-markets.ts → 新增型別 PM{Name}Response + client 方法
  - app/api/{path}/route.ts → API Route
  - 測試結果：{status_code}
```
