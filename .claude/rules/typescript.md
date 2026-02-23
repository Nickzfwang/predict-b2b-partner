# TypeScript 規則

## 嚴格模式

- `strict: true` 已啟用
- 型別檢查：`npx tsc --noEmit`

## 禁止事項

- **禁止使用 `any`** — 用 `unknown` + type narrowing
- 禁止 `@ts-ignore` / `@ts-expect-error`（除非附帶詳細說明）
- 禁止 non-null assertion `!` 除非有充分理由

## 命名規範

| 項目 | 規則 | 範例 |
|------|------|------|
| Interface | PascalCase + 後綴 | `ArticleCardProps`, `EmbedTokenResponse` |
| Type | PascalCase | `DemoUser`, `MarketStatus` |
| 常數 | UPPER_SNAKE_CASE | `DEFAULT_DEMO_BALANCE` |
| 變數/函式 | camelCase | `handleTradeComplete`, `embedToken` |

## predict-markets API 回應型別

在 `lib/predict-markets.ts` 中定義對應 API 回應的 interface，不用 `any` 接：

```typescript
// ✅
interface PMMarket {
  id: string;
  title: string;
  yes_price: number;
  no_price: number;
  status: 'open' | 'closed' | 'judging' | 'resolved';
  volume: number;
  closes_at: string;
}

// ❌
const market: any = await pmClient.get('/markets');
```

## 最佳實踐

- 用 discriminated union 處理多狀態（loading / error / success）
- Server Component props 不需要標記 `Readonly`（Next.js 已處理）
- API Route handler 用 `NextRequest` / `NextResponse` 型別
