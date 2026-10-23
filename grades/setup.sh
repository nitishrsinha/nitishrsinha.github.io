#!/bin/bash
# One-time setup for the qis-grades worker. Safe to re-run.
#   1. logs in to Cloudflare (browser) if needed
#   2. creates the GRADES KV namespace and writes its id into wrangler.toml
#   3. deploys the worker
# Then publish grades with: ~/.venvs/main/bin/python sync.py
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
WRANGLER="npx --yes wrangler@4"

$WRANGLER whoami 2>/dev/null | grep -q "You are logged in" || $WRANGLER login

if grep -q REPLACE_WITH_KV_ID wrangler.toml; then
  id=$($WRANGLER kv namespace create GRADES | grep -oE '[0-9a-f]{32}' | head -1)
  [[ -n "$id" ]] || { echo "Could not create KV namespace" >&2; exit 1; }
  sed -i "s/REPLACE_WITH_KV_ID/$id/" wrangler.toml
  echo "KV namespace: $id"
fi

$WRANGLER deploy
