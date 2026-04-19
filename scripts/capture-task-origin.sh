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

# Task #519 — Always write the sidecar pointer FIRST, even if the Origin /
# Request section is already present. The pointer is what post-merge.sh
# uses to know exactly which plan file goes with the next merge instead
# of guessing with `ls -t`. scripts/post-merge.sh deletes this file after
# it processes the merge.
mkdir -p .local
echo "$PLAN_FILE" > .local/.last-merged-task-plan
echo "Wrote sidecar pointer .local/.last-merged-task-plan -> $PLAN_FILE"

if grep -q "^## Origin / Request" "$PLAN_FILE" 2>/dev/null; then
  echo "Origin / Request section already present in $PLAN_FILE, skipping append."
  exit 0
fi

printf "\n## Origin / Request\n%s\n" "$USER_PROMPT" >> "$PLAN_FILE"
echo "Appended Origin / Request section to $PLAN_FILE"
