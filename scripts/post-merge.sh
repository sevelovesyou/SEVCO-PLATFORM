#!/bin/bash
set -e
npm install
npm run db:push

LATEST_TASK=$(ls -t .local/tasks/*.md 2>/dev/null | head -1)
if [ -n "$LATEST_TASK" ]; then
  echo "Creating wiki article from task plan: $LATEST_TASK"
  node scripts/create-wiki-article.js "$LATEST_TASK" || true
  echo "Appending to update log and changelog: $LATEST_TASK"
  node scripts/append-to-update-log.js "$LATEST_TASK" || true
else
  echo "No task plan files found, skipping wiki article and update log."
fi
