#!/bin/bash
#
# One-time setup helper for the research-gate worker.
# Generates a TOTP secret, prints the otpauth URI (and a QR code if qrencode
# is installed), and walks through the wrangler commands.
#
set -euo pipefail

LABEL="Research%20Materials"
ISSUER="nitishrsinha.github.io"

echo "== research-gate setup =="
echo ""

# 1. Generate a TOTP secret (160-bit, base32 — the standard authenticator format)
TOTP_SECRET=$(head -c 20 /dev/urandom | base32 | tr -d '=')
OTPAUTH_URI="otpauth://totp/${LABEL}?secret=${TOTP_SECRET}&issuer=${ISSUER}"

echo "TOTP secret (base32): ${TOTP_SECRET}"
echo ""
echo "Add it to your authenticator app:"
if command -v qrencode &>/dev/null; then
  qrencode -t ANSIUTF8 "${OTPAUTH_URI}"
  echo "(scan the QR code above, or enter the secret manually)"
else
  echo "  - open your authenticator app, choose 'enter setup key manually'"
  echo "  - account: Research Materials, key: ${TOTP_SECRET}, type: time-based"
  echo "  (install 'qrencode' and rerun to get a scannable QR code instead)"
fi
echo ""

echo "Now run, in this directory:"
echo ""
echo "  1. wrangler kv namespace create RATE_LIMIT"
echo "       -> paste the printed id into wrangler.toml (skip if already done)"
echo ""
echo "  2. echo -n '${TOTP_SECRET}' | wrangler secret put TOTP_SECRET"
echo ""
echo "  3. openssl rand -hex 32 | tr -d '\\n' | wrangler secret put STATICRYPT_KEY"
echo ""
echo "  4. echo -n '<fine-grained GitHub PAT>' | wrangler secret put GITHUB_TOKEN"
echo "       -> see README.md for the exact token scopes"
echo ""
echo "  5. wrangler deploy"
echo "       -> note the workers.dev URL and set WORKER_URL in private/index.html"
echo ""
echo "IMPORTANT: this secret is shown only once. It now lives in your"
echo "authenticator app and (after step 2) in Cloudflare. Don't save it elsewhere."
