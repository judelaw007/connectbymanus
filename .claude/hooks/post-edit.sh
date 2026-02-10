#!/bin/bash
set -euo pipefail

# post-edit.sh — Auto-format files with Prettier after Write/Edit
# Stdin: JSON with tool_name, tool_input (including file_path)
# Only formats files with supported extensions

INPUT=$(cat)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Extract the file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only format Prettier-supported extensions
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json|*.md|*.html)
    ;;
  *)
    exit 0
    ;;
esac

# Skip files outside the project directory
case "$FILE_PATH" in
  "$PROJECT_DIR"/*)
    ;;
  *)
    exit 0
    ;;
esac

# Skip generated/vendored paths
case "$FILE_PATH" in
  */node_modules/*|*/dist/*|*/build/*|*/.git/*)
    exit 0
    ;;
esac

# Skip machine-managed files
case "$(basename "$FILE_PATH")" in
  progress.log)
    exit 0
    ;;
esac

# Run Prettier on just this file
if [[ -f "$FILE_PATH" ]]; then
  cd "$PROJECT_DIR"
  npx prettier --write --log-level error "$FILE_PATH" 2>/dev/null || true
fi

exit 0
