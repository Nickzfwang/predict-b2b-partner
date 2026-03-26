---
name: add-page
description: "新增頁面 — 快速建立含 SDK Widget 或 API 資料的新頁面"
---

# /add-page

引導式建立新的 Next.js 頁面，遵循專案慣例。

## 使用方式

```
/add-page                     # 互動式引導
/add-page /settings 設定頁面   # 直接指定路由和標題
```

## 工作流程

### Phase 1: 確認規格

詢問或從參數解析：
1. **路由路徑** — 例如 `/settings`
2. **頁面標題** — 例如「設定」
3. **頁面類型**：
   - **embed** — 嵌入 PredictMarket SDK Widget
   - **api-data** — 從 API 取得資料並顯示
   - **static** — 靜態內容頁面
   - **form** — 表單頁面（需要 'use client'）
4. **是否需要登入（demo user）** — 大部分功能頁需要

### Phase 2: 建立頁面

#### embed 類型

```typescript
// app/{route}/page.tsx — Server Component
import { EmbedWidget } from '@/components/EmbedWidget';

export default async function PageName({ searchParams }: Props) {
  const { user, mode } = await searchParams;
  // 1. sync user
  // 2. get embed token
  // 3. render EmbedWidget with route/theme
  return (
    <main>
      <h1>頁面標題</h1>
      <EmbedWidget
        embedBaseUrl={embedBaseUrl}
        initialToken={token}
        userId={user}
        route="/markets"
        walletMode={mode}
      />
    </main>
  );
}
```

#### api-data 類型

```typescript
// app/{route}/page.tsx — Server Component
// 直接呼叫 lib/predict-markets.ts 取得資料

export default async function PageName({ searchParams }: Props) {
  const data = await pmClient.getSomeData();
  return (
    <main>
      <h1>頁面標題</h1>
      {/* 渲染資料 */}
    </main>
  );
}
```

#### form 類型

```typescript
// app/{route}/page.tsx — Server Component（外殼）
// components/{Name}Form.tsx — 'use client'（表單邏輯）
```

### Phase 3: 加入導航

在 `components/NavLinks.tsx` 的 `NAV_ITEMS` 陣列新增項目：

```typescript
{ href: '/{route}', label: '頁面標題' },
```

### Phase 4: 驗證

1. 執行 `npx tsc --noEmit` 確認型別正確
2. 用 Preview 截圖確認頁面渲染正常

### 輸出

```
✅ 已建立：
  - app/{route}/page.tsx → 頁面元件
  - components/{Name}.tsx → Client 元件（如需要）
  - components/NavLinks.tsx → 導航連結已新增
```
