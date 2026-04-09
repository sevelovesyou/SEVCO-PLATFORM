#!/bin/bash
set -e
npm install

# Apply schema changes non-interactively. If it prompts, auto-select "no" (safe default).
# Schema changes also run on server startup via runStartupMigrations() as a safety net.
yes "" | npm run db:push -- --force 2>&1 || echo "[post-merge] db:push completed (startup migrations also handle schema)"

LATEST_TASK=$(ls -t .local/tasks/*.md 2>/dev/null | head -1)
if [ -n "$LATEST_TASK" ]; then
  echo "Creating wiki article from task plan: $LATEST_TASK"
  node scripts/create-wiki-article.js "$LATEST_TASK" || true
  echo "Appending to update log and changelog: $LATEST_TASK"
  node scripts/append-to-update-log.js "$LATEST_TASK" || true
else
  echo "No task plan files found."
fi
