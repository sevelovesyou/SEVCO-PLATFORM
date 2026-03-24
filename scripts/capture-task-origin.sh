#!/bin/bash
set -e

PLAN_FILE="$1"
USER_PROMPT="$2"

if [ -z "$PLAN_FILE" ] || [ -z "$USER_PROMPT" ]; then
  echo "Usage: bash scripts/capture-task-origin.sh <plan-file> <user-prompt>"
  exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: Plan file not found: $PLAN_FILE"
  exit 1
fi

if grep -q "^## Origin / Request" "$PLAN_FILE" 2>/dev/null; then
  echo "Origin / Request section already present in $PLAN_FILE, skipping."
  exit 0
fi

printf "\n## Origin / Request\n%s\n" "$USER_PROMPT" >> "$PLAN_FILE"
echo "Appended Origin / Request section to $PLAN_FILE"
