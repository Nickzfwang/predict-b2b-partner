---
name: code-review
description: "程式碼審查 — 檢查安全性、型別、效能與風格"
---

# /code-review

對當前分支的變更進行結構化程式碼審查。

## 使用方式

```
/code-review              # 審查所有未 commit 的變更
/code-review --staged     # 只審查 staged 變更
/code-review <file>       # 審查指定檔案
```

## 審查流程

### Step 1: 收集變更

```bash
# 取得變更的檔案列表
git diff --name-only
git diff --staged --name-only
```

### Step 2: 逐檔審查

對每個變更的檔案，依以下分類檢查：

#### 🔴 Critical（必須修正）

- [ ] `PM_API_SECRET` 或任何 secret 是否暴露在 Client-side？
- [ ] `'use client'` 檔案是否 import 了 `lib/predict-markets.ts`？
- [ ] API Route 是否有未處理的 error（可能洩漏內部訊息）？
- [ ] 是否使用了 `any` 型別？
- [ ] 是否有 XSS 風險（未 sanitize 的 user input 直接渲染）？

#### 🟡 Warning（建議修正）

- [ ] 元件是否處理了 loading / error / empty 三種狀態？
- [ ] Props interface 是否完整定義？
- [ ] 是否有不必要的 `'use client'`（可以保持 Server Component）？
- [ ] API Route 是否支援 walletMode 切換？
- [ ] 是否有 hardcoded 的 URL 或 magic number？

#### 🟢 Suggestion（可以改善）

- [ ] 命名是否符合慣例（PascalCase / camelCase / UPPER_SNAKE）？
- [ ] 是否有重複的程式碼可以抽取？
- [ ] Tailwind class 是否過長（可抽取成元件）？
- [ ] 註解是否充足？

### Step 3: 輸出報告

```markdown
## Code Review Report

### 🔴 Critical (N)
- [file:line] 問題描述

### 🟡 Warning (N)
- [file:line] 問題描述

### 🟢 Suggestion (N)
- [file:line] 問題描述

### ✅ Summary
- 共審查 N 個檔案
- Critical: N / Warning: N / Suggestion: N
- 結論：✅ 可合併 / ⚠️ 需修正後合併 / 🚫 需重大修改
```
