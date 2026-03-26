#!/usr/bin/env bash
# Post-edit hook: 根據修改的檔案類型自動執行 lint
# 由 Claude Code 的 postEdit hook 觸發

set -euo pipefail

FILE_PATH=$(cat)

# 只處理 TypeScript / JavaScript 檔案
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    # TypeScript 型別檢查（僅檢查，不阻斷）
    npx tsc --noEmit --pretty 2>&1 | head -20 || true

    # ESLint 檢查指定檔案
    npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 | head -20 || true
    ;;
  *.css)
    echo "[lint-after-edit] CSS file changed: $FILE_PATH"
    ;;
  *)
    # 非前端檔案，跳過
    ;;
esac
