#!/usr/bin/env bash
set -euo pipefail
REMOTE="${1:-}"
MSG="${2:-Version 1.3.3}"
if [ -z "$REMOTE" ]; then
  echo "Usage: ./push.sh <git-remote-url> [commit message]"
  exit 1
fi
git init
git branch -M main || true
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git add .
git commit -m "$MSG" || true
git push -u origin main
