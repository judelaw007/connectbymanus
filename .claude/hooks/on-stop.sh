#!/bin/bash
set -euo pipefail

# on-stop.sh — Tracks progress and warns about plan deviation
# Stdin: JSON with stop_hook_active, session_id, transcript_path, cwd
# Exit 0: success (warnings via JSON systemMessage)
# Exit 2: block (NOT USED — warn-only mode)

INPUT=$(cat)

# ── Recursion guard ──
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PLAN_FILE="$PROJECT_DIR/PLAN.md"
PROGRESS_LOG="$PROJECT_DIR/.claude/progress.log"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ── Detect what changed via git ──
CHANGED_FILES=""
GIT_SUMMARY=""
if git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  CHANGED_FILES=$(cd "$PROJECT_DIR" && {
    git diff --name-only 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u)

  GIT_SUMMARY=$(cd "$PROJECT_DIR" && git log --oneline --since="1 hour ago" -5 2>/dev/null || echo "")
fi

# ── Auto-append to progress log ──
if [[ -n "$CHANGED_FILES" || -n "$GIT_SUMMARY" ]]; then
  mkdir -p "$(dirname "$PROGRESS_LOG")"
  {
    echo ""
    echo "--- Session: $SESSION_ID | $TIMESTAMP ---"
    if [[ -n "$GIT_SUMMARY" ]]; then
      echo "Commits:"
      echo "$GIT_SUMMARY" | sed 's/^/  /'
    fi
    if [[ -n "$CHANGED_FILES" ]]; then
      echo "Files changed:"
      echo "$CHANGED_FILES" | sed 's/^/  /'
    fi
  } >> "$PROGRESS_LOG"
fi

# ── Check for plan deviation ──
DEVIATION_WARNING=""
if [[ -f "$PLAN_FILE" && -n "$CHANGED_FILES" ]]; then
  HAS_PLAN_RELATED=false

  while IFS= read -r file; do
    if [[ -n "$file" ]] && grep -qi "$(basename "$file" | sed 's/\.\w*$//')" "$PLAN_FILE" 2>/dev/null; then
      HAS_PLAN_RELATED=true
      break
    fi
  done <<< "$CHANGED_FILES"

  FILE_COUNT=$(echo "$CHANGED_FILES" | grep -c '.' || echo "0")
  if [[ "$HAS_PLAN_RELATED" == "false" && "$FILE_COUNT" -gt 3 ]]; then
    CURRENT_FOCUS=$(sed -n '/^## Priorities/,/^## /{/^## /d;/^$/d;p;}' "$PLAN_FILE" | grep '^\- \[ \]' | head -3)
    DEVIATION_WARNING="NOTE: $FILE_COUNT files changed but none appear to match current plan priorities. Current focus: $CURRENT_FOCUS"
  fi
fi

# ── Check if architectural files changed ──
ARCH_WARNING=""
if echo "$CHANGED_FILES" | grep -qE '(server/_core/|server/routers\.ts|server/db\.ts|client/src/App\.tsx|package\.json|tsconfig\.json|vite\.config\.ts)'; then
  ARCH_WARNING="Architectural files were modified. Consider whether CLAUDE.md needs updating."
fi

# ── Output warnings via JSON systemMessage ──
MESSAGES=""
if [[ -n "$DEVIATION_WARNING" ]]; then
  MESSAGES="$DEVIATION_WARNING"
fi
if [[ -n "$ARCH_WARNING" ]]; then
  if [[ -n "$MESSAGES" ]]; then
    MESSAGES="$MESSAGES | $ARCH_WARNING"
  else
    MESSAGES="$ARCH_WARNING"
  fi
fi

if [[ -n "$MESSAGES" ]]; then
  # Escape for JSON
  ESCAPED=$(echo "$MESSAGES" | sed 's/"/\\"/g' | tr '\n' ' ')
  printf '{"systemMessage": "%s"}' "$ESCAPED"
fi

exit 0
