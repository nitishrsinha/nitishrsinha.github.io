#!/bin/bash
# One-time setup for the qis-quiz worker. Safe to re-run.
#   1. logs in to Cloudflare (browser) if needed
#   2. creates the QUIZ KV namespace and writes its id into wrangler.toml
#   3. generates an admin password (saved to .admin-password, gitignored)
#   4. deploys the worker and uploads every quiz in quizzes/
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
WRANGLER="npx --yes wrangler@4"

$WRANGLER whoami 2>/dev/null | grep -q "You are logged in" || $WRANGLER login

if grep -q REPLACE_WITH_KV_ID wrangler.toml; then
  id=$($WRANGLER kv namespace create QUIZ | grep -oE '[0-9a-f]{32}' | head -1)
  [[ -n "$id" ]] || { echo "Could not create KV namespace" >&2; exit 1; }
  sed -i "s/REPLACE_WITH_KV_ID/$id/" wrangler.toml
  echo "KV namespace: $id"
fi

if [[ ! -s .admin-password ]]; then
  (umask 077; openssl rand -base64 18 | tr -d '/+=\n' > .admin-password)
fi

$WRANGLER deploy
tr -d '\n' < .admin-password | $WRANGLER secret put ADMIN_PASSWORD

for f in quizzes/*.json; do ./quiz-upload.sh "$(basename "$f" .json)"; done

echo
echo "Admin password: $(cat .admin-password)"
