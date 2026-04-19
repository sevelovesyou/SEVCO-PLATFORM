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
  # Task #526 — Resolve the canonical Replit task ref. Order matters:
  #   1. If LATEST_TASK itself is named task-NNN.md, use NNN — this is the
  #      ONLY truly-merged-plan-derived signal; it can never be off.
  #   2. Otherwise parse the first "# Task #N" line from the plan content.
  #   3. Only as a last resort, fall back to the highest .local/tasks/task-NNN.md
  #      on disk (which is wrong for backports / out-of-order merges, hence last).
  # We pass the result as argv[3] to append-to-update-log.js, which has the
  # same fallback chain in JS as a defense-in-depth.
  PLAN_BASENAME=$(basename "$LATEST_TASK")
  TASK_REF=$(echo "$PLAN_BASENAME" | sed -nE 's/^task-([0-9]+)\.md$/\1/p')
  if [ -z "$TASK_REF" ]; then
    TASK_REF=$(grep -m1 -oE '^#[[:space:]]*Task[[:space:]]*#[0-9]+' "$LATEST_TASK" 2>/dev/null \
      | grep -oE '[0-9]+' | head -1)
  fi
  if [ -z "$TASK_REF" ]; then
    TASK_REF=$(ls .local/tasks/task-*.md 2>/dev/null \
      | sed -E 's@.*/task-([0-9]+)\.md$@\1@' \
      | grep -E '^[0-9]+$' \
      | sort -n | tail -1)
    if [ -n "$TASK_REF" ]; then
      echo "[post-merge] WARNING: plan file '$PLAN_BASENAME' has no task ref in name or '# Task #N' header — falling back to highest .local/tasks/task-${TASK_REF}.md. This may be wrong for backports."
    fi
  else
    echo "[post-merge] Resolved task ref #${TASK_REF} from plan file '$PLAN_BASENAME'"
  fi
  if [ -z "$TASK_REF" ]; then
    echo "[post-merge] No task ref could be determined — letting append-to-update-log.js fall back to its own resolver"
  fi
  # Task #517 — Do NOT swallow this exit code. If the wiki article POST
  # fails the script exits non-zero; surfacing that failure here is what
  # keeps /platform and /changelog from drifting silently.
  node scripts/append-to-update-log.js "$LATEST_TASK" "$TASK_REF"

  # Task #525 — After the changelog/wiki upsert completes, dump every
  # platform-task-* changelog row + its matching wiki article content to
  # data/changelog-snapshot.json. The file is committed as part of the
  # merge so the next deploy ships it; production then reads it at boot
  # and self-syncs its own DB. This is what keeps sevco.us aligned with
  # the Replit preview without ever touching deployment secrets.
  echo "Dumping changelog snapshot to data/changelog-snapshot.json"
  # Task #525 — Hard-fail if the snapshot dump errors. The whole point of
  # the snapshot pipeline is that prod self-syncs to whatever is committed
  # in this file; silently shipping a stale snapshot is the failure mode
  # this task exists to eliminate.
  node scripts/dump-changelog-snapshot.js
else
  echo "No task plan files found."
fi

# Task #519 — Always remove the sidecar after processing so a stale pointer
# can never be reused on the next merge. Done unconditionally because even
# if the script above fails, re-running it should re-read the freshest plan.
rm -f "$SIDECAR"
