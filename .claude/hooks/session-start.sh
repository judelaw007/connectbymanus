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

# ── Read current sprint from PLAN.md ──
CURRENT_SPRINT=""
SPRINT_ITEMS=""
BLOCKERS=""
if [[ -f "$PLAN_FILE" ]]; then
  CURRENT_SPRINT=$(sed -n '/^## Current Sprint/,/^## /{/^## Current Sprint/d;/^## /d;p;}' "$PLAN_FILE" | head -5)
  SPRINT_ITEMS=$(sed -n '/^## Priorities/,/^## /{/^## /d;p;}' "$PLAN_FILE" | head -30)
  BLOCKERS=$(sed -n '/^## Blockers/,/^## /{/^## /d;p;}' "$PLAN_FILE" | head -10)
else
  CURRENT_SPRINT="WARNING: No PLAN.md found at $PLAN_FILE"
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

# ── Find critical open issues ──
CRITICAL_OPEN=""
if [[ -f "$PLAN_FILE" ]]; then
  CRITICAL_OPEN=$(sed -n '/^### CRITICAL/,/^### /{/^### /d;p;}' "$PLAN_FILE" | grep '^\- \[ \]' | head -5)
fi

# ── Build the output ──
cat <<CONTEXT
===== MOJITAX CONNECT PROJECT STATUS =====

Session type: $SOURCE
Progress: $DONE_ITEMS / $TOTAL_ITEMS plan items completed

--- CURRENT SPRINT ---
$CURRENT_SPRINT

--- PRIORITY ITEMS ---
$SPRINT_ITEMS

--- BLOCKERS ---
${BLOCKERS:-None identified}

--- CRITICAL OPEN ISSUES ---
${CRITICAL_OPEN:-None — all critical items resolved}

--- RECENT SESSION ACTIVITY ---
${RECENT_PROGRESS:-No previous session activity recorded}

===== INSTRUCTIONS =====
You are working on MojiTax Connect. Before doing ANY work:
1. Present this status summary to the user
2. Highlight any CRITICAL open issues prominently
3. Suggest the top 2-3 priority items from the plan
4. ASK: "What would you like to focus on this session?"
5. Do NOT start coding until the user confirms what to work on
===========================================
CONTEXT

exit 0
