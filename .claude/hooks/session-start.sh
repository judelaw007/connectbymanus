#!/bin/bash
set -euo pipefail

# session-start.sh — Loads project context and prompts Claude to ask user for focus area
# Stdin: JSON with session_id, source, cwd, etc.
# Stdout: Added as context for Claude

INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"')

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
PLAN_FILE="$PROJECT_DIR/PLAN.md"
PROGRESS_LOG="$PROJECT_DIR/.claude/progress.log"

# ── Read current status from PLAN.md ──
CURRENT_STATUS=""
FUTURE_ITEMS=""
if [[ -f "$PLAN_FILE" ]]; then
  CURRENT_STATUS=$(sed -n '/^## Current Status/,/^## /{/^## Current Status/d;/^## /d;p;}' "$PLAN_FILE" | head -10)
  FUTURE_ITEMS=$(sed -n '/^### Future enhancements/,/^## /{/^### /d;/^## /d;p;}' "$PLAN_FILE" | head -10)
else
  CURRENT_STATUS="WARNING: No PLAN.md found at $PLAN_FILE"
fi

# ── Read recent progress (last 30 lines) ──
RECENT_PROGRESS=""
if [[ -f "$PROGRESS_LOG" ]]; then
  RECENT_PROGRESS=$(tail -30 "$PROGRESS_LOG")
fi

# ── Count completion from checkboxes ──
TOTAL_ITEMS=0
DONE_ITEMS=0
if [[ -f "$PLAN_FILE" ]]; then
  TOTAL_ITEMS=$(grep -c '^\- \[[ x]\]' "$PLAN_FILE" 2>/dev/null || echo "0")
  DONE_ITEMS=$(grep -c '^\- \[x\]' "$PLAN_FILE" 2>/dev/null || echo "0")
fi

# ── Build the output ──
cat <<CONTEXT
===== MOJITAX CONNECT PROJECT STATUS =====

Session type: $SOURCE
Progress: $DONE_ITEMS / $TOTAL_ITEMS plan items completed
Platform status: PRODUCTION READY

--- CURRENT STATUS ---
$CURRENT_STATUS

--- FUTURE ENHANCEMENTS (post-launch) ---
${FUTURE_ITEMS:-None pending}

--- RECENT SESSION ACTIVITY ---
${RECENT_PROGRESS:-No previous session activity recorded}

===== INSTRUCTIONS =====
You are working on MojiTax Connect. The platform is production-ready.
Key documentation: CLAUDE.md (architecture), USER_GUIDE.md, ADMIN_GUIDE.md, PLAN.md (history).
ASK: "What would you like to work on?"
===========================================
CONTEXT

exit 0
