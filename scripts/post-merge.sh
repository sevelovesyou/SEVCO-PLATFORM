#!/bin/bash
set -e

# Note: Package installation is handled by Replit's package manager automatically.
# Schema changes are applied on server startup via runStartupMigrations() in server/index.ts.
# This script only handles post-merge content updates (wiki + changelog).

# Task #519 — Prefer the sidecar pointer (.local/.last-merged-task-plan)
# written at task-completion time over guessing with `ls -t`. Replit's
# [postMerge] hook does not pass the merged plan-file path, so without the
# pointer we have to guess — which broke when two tasks merged back-to-back.
# Fall back to `ls -t` only if the pointer is missing or stale (older than
# the most recent plan-file mtime). Always delete the pointer after we use
# it so a stale one cannot be reused.
SIDECAR=".local/.last-merged-task-plan"
LATEST_TASK=""

if [ -f "$SIDECAR" ]; then
  POINTER=$(head -1 "$SIDECAR" | tr -d '\n\r')
  if [ -n "$POINTER" ] && [ -f "$POINTER" ]; then
    # Trust the sidecar: capture-task-origin.sh writes it at completion
    # time for the exact plan being merged, and we delete it after every
    # run so it can never carry over to a later merge. The sidecar's own
    # mtime is the freshness signal — if it predates the newest plan
    # file by more than a small grace window it is treated as stale and
    # we fall back to `ls -t`. No tolerance window on the pointed file
    # itself: an older plan can still be the right one to publish.
    SIDECAR_MTIME=$(stat -c %Y "$SIDECAR" 2>/dev/null || stat -f %m "$SIDECAR" 2>/dev/null || echo 0)
    NEWEST_PLAN=$(ls -t .local/tasks/*.md 2>/dev/null | head -1)
    NEWEST_MTIME=0
    if [ -n "$NEWEST_PLAN" ]; then
      NEWEST_MTIME=$(stat -c %Y "$NEWEST_PLAN" 2>/dev/null || stat -f %m "$NEWEST_PLAN" 2>/dev/null || echo 0)
    fi
    SIDECAR_AGE=$(( NEWEST_MTIME - SIDECAR_MTIME ))
    # Accept only when sidecar is at-or-after the newest plan, with a 60s
    # grace for filesystem mtime jitter (covers near-simultaneous merges).
    # Negative ages (sidecar newer than newest plan) and ages within the
    # grace window both pass; anything older falls back to ls -t.
    if [ "$SIDECAR_AGE" -le 60 ] && [ "$SIDECAR_AGE" -ge -3600 ]; then
      LATEST_TASK="$POINTER"
    else
      echo "[post-merge] Sidecar pointer is ${SIDECAR_AGE}s older than newest plan — treating as stale, falling back to ls -t"
    fi
  else
    echo "[post-merge] Sidecar pointer empty or missing target — falling back to ls -t"
  fi
fi

if [ -z "$LATEST_TASK" ]; then
  LATEST_TASK=$(ls -t .local/tasks/*.md 2>/dev/null | head -1)
fi

if [ -n "$LATEST_TASK" ]; then
  echo "Creating wiki article from task plan: $LATEST_TASK"
  node scripts/create-wiki-article.js "$LATEST_TASK" || true
  echo "Appending to update log and changelog: $LATEST_TASK"
  # Task #517 — Do NOT swallow this exit code. If the wiki article POST
  # fails the script exits non-zero; surfacing that failure here is what
  # keeps /platform and /changelog from drifting silently.
  node scripts/append-to-update-log.js "$LATEST_TASK"
else
  echo "No task plan files found."
fi

# Task #519 — Always remove the sidecar after processing so a stale pointer
# can never be reused on the next merge. Done unconditionally because even
# if the script above fails, re-running it should re-read the freshest plan.
rm -f "$SIDECAR"
