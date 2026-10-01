#!/bin/bash

#########################################################
# Per-week encryption for QIS course materials.
#
# - Encrypts weekNN/source/*.html with staticrypt (AES-256, client-side)
# - Encrypts weekNN/source/*.pdf with qpdf (native PDF AES-256 password)
# - Both use the SAME password for a given week, which you choose and pass
#   explicitly every time -- this is required (not generated or reused)
#   because .week-passwords is a local, gitignored cache that will NOT
#   exist on another machine. Keep the real password list in a password
#   manager or private note; this script never invents one for you.
#
# Usage:
#   ./encrypt-week.sh week03 "ThePasswordYouChose"
#
# Requires: staticrypt (npm install -g staticrypt), qpdf
#########################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WEEK="${1:?Usage: ./encrypt-week.sh weekNN \"ThePasswordYouChose\"}"
PASSWORD="${2:?Usage: ./encrypt-week.sh weekNN \"ThePasswordYouChose\"}"
SRC="$WEEK/source"
PW_FILE=".week-passwords"

if [[ ! -d "$SRC" ]]; then
  echo "No source directory found: $SRC" >&2
  echo "Put the plaintext notes.html and reading PDFs for that week in ${SRC}/ first." >&2
  exit 1
fi

if ! command -v staticrypt &> /dev/null; then
  echo "ERROR: staticrypt not found. Install with: npm install -g staticrypt" >&2
  exit 1
fi
if ! command -v qpdf &> /dev/null; then
  echo "ERROR: qpdf not found. Install with your package manager (e.g. apt install qpdf)." >&2
  exit 1
fi

touch "$PW_FILE"
chmod 600 "$PW_FILE"

grep -v "^${WEEK}=" "$PW_FILE" > "${PW_FILE}.tmp" 2>/dev/null || true
mv "${PW_FILE}.tmp" "$PW_FILE"
echo "${WEEK}=${PASSWORD}" >> "$PW_FILE"
echo "Saved password for ${WEEK} to this machine's local cache (${PW_FILE})."

shopt -s nullglob

HTML_FILES=("$SRC"/*.html)
PDF_FILES=("$SRC"/*.pdf)

if [[ ${#HTML_FILES[@]} -eq 0 && ${#PDF_FILES[@]} -eq 0 ]]; then
  echo "No .html or .pdf files found in ${SRC}/." >&2
  exit 1
fi

for html in "${HTML_FILES[@]}"; do
  name=$(basename "$html")
  echo "Encrypting (staticrypt): $name"
  staticrypt "$html" -p "$PASSWORD" -d "$WEEK" --short
done

for pdf in "${PDF_FILES[@]}"; do
  name=$(basename "$pdf")
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed -E 's/\.pdf$//; s/[^a-z0-9]+/-/g; s/^-+|-+$//g')
  out="$WEEK/${slug}.pdf"
  echo "Encrypting (qpdf): $name -> ${slug}.pdf"
  set +e
  qpdf --encrypt "$PASSWORD" "$PASSWORD" 256 -- "$pdf" "$out"
  rc=$?
  set -e
  # qpdf exits 3 for "succeeded with warnings" (e.g. minor structural quirks
  # in the source PDF) -- the output is still written and usable. Only
  # treat other exit codes as a real failure.
  if [[ $rc -ne 0 && $rc -ne 3 ]]; then
    echo "ERROR: qpdf failed on $name (exit $rc)" >&2
    exit 1
  fi
done

echo ""
echo "Done. Password for ${WEEK}: ${PASSWORD}"
echo "Commit the encrypted files in ${WEEK}/ -- never commit ${SRC}/."
