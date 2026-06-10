#!/bin/bash

#########################################################
# StatiCrypt Encryption Script for Protected Content
#
# - Converts Markdown (*.md) to HTML using pandoc (if installed)
# - Encrypts HTML files in this directory using StatiCrypt (AES-256)
#
# Usage: ./encrypt.sh
#
# Notes:
# - GitHub (github.com) will always show whatever is committed in your repo.
#   To protect content, you must commit/push the ENCRYPTED HTML output.
#########################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  StatiCrypt Encryption Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Working directory: ${SCRIPT_DIR}${NC}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p .backups

# Check if staticrypt is installed
if ! command -v staticrypt &> /dev/null; then
  echo -e "${RED}ERROR: StatiCrypt is not installed!${NC}"
  echo ""
  echo -e "${YELLOW}To install StatiCrypt, run:${NC}"
  echo -e "  ${GREEN}npm install -g staticrypt${NC}"
  exit 1
fi
echo -e "${GREEN}✓ StatiCrypt is installed${NC}"

# Check if pandoc is installed (optional)
HAS_PANDOC=0
if command -v pandoc &> /dev/null; then
  HAS_PANDOC=1
  echo -e "${GREEN}✓ pandoc is installed (Markdown → HTML enabled)${NC}"
else
  echo -e "${YELLOW}⚠ pandoc not found (Markdown → HTML disabled).${NC}"
  echo -e "${YELLOW}  Install it if you want to encrypt .md content via HTML:${NC}"
  echo -e "  ${GREEN}  https://pandoc.org/installing.html${NC}"
fi
echo ""

# Grab StatiCrypt help text once so we can adapt to different versions
STATICRYPT_HELP="$(staticrypt --help 2>&1 || true)"

# Build args in a version-tolerant way
# Password flag
PASS_FLAG_SUPPORTED=0
if echo "$STATICRYPT_HELP" | grep -qE '(-p, --password|--password)'; then
  PASS_FLAG_SUPPORTED=1
fi

# Output directory flag
DIR_FLAG_SUPPORTED=0
if echo "$STATICRYPT_HELP" | grep -qE '(-d, --directory|--directory)'; then
  DIR_FLAG_SUPPORTED=1
fi

# Remember-me flag (optional)
REMEMBER_FLAG_SUPPORTED=0
if echo "$STATICRYPT_HELP" | grep -qE '(--remember)'; then
  REMEMBER_FLAG_SUPPORTED=1
fi

# Convert Markdown to HTML (if pandoc available)
if [[ "$HAS_PANDOC" -eq 1 ]]; then
  # Find markdown files in this directory only
  mapfile -t MD_FILES < <(find . -maxdepth 1 -type f -name "*.md" -printf "%f\n" | sort)

  if [[ "${#MD_FILES[@]}" -gt 0 ]]; then
    echo -e "${BLUE}Found ${#MD_FILES[@]} Markdown file(s) to convert to HTML:${NC}"
    for md in "${MD_FILES[@]}"; do
      echo -e "  - ${md}"
    done
    echo ""

    for md in "${MD_FILES[@]}"; do
      base="${md%.md}"
      out_html="${base}.html"

      echo -e "${BLUE}Converting: ${md} -> ${out_html}${NC}"

      # Backup existing HTML if it exists (since we'll overwrite)
      if [[ -f "$out_html" ]]; then
        PRE_BACKUP=".backups/${out_html}.prepandoc.$(date +%Y%m%d_%H%M%S).html"
        cp "$out_html" "$PRE_BACKUP"
        echo -e "  ${GREEN}✓ Existing HTML backed up: ${PRE_BACKUP}${NC}"
      fi

      # Convert MD to standalone HTML
      pandoc "$md" \
        --standalone \
        --metadata "title=${base}" \
        -o "$out_html"

      echo -e "  ${GREEN}✓ Converted successfully${NC}"
      echo ""
    done
  fi
fi

# Find HTML files to encrypt.
# Excluded: index.html (the TOTP gate page - must stay unencrypted) and any
# file that is already StatiCrypt output (re-encrypting would double-wrap it).
mapfile -t CANDIDATE_FILES < <(find . -maxdepth 1 -type f -name "*.html" ! -name "*.encrypted.html" ! -name "index.html" -printf "%f\n" | sort)

HTML_FILES=()
for file in "${CANDIDATE_FILES[@]}"; do
  if grep -q 'staticrypt-html' "$file"; then
    echo -e "${YELLOW}⚠ Skipping ${file}: already StatiCrypt-encrypted.${NC}"
    echo -e "${YELLOW}  To re-encrypt it, restore the plaintext original first (see .backups/).${NC}"
  else
    HTML_FILES+=("$file")
  fi
done
NUM_FILES=${#HTML_FILES[@]}

if [[ "$NUM_FILES" -eq 0 ]]; then
  echo -e "${YELLOW}No HTML files found to encrypt in this directory.${NC}"
  echo ""
  echo "Put .html files here (or .md files with pandoc installed), then rerun."
  exit 0
fi

echo -e "${BLUE}Found ${NUM_FILES} HTML file(s) to encrypt:${NC}"
for file in "${HTML_FILES[@]}"; do
  echo -e "  - ${file}"
done
echo ""

# Password selection:
#   STATICRYPT_PASSWORD=auto      generate a strong random password (recommended;
#                                 you never need to know it - the TOTP worker stores the derived key)
#   STATICRYPT_PASSWORD=<value>   use that password
#   unset                         prompt interactively (legacy behavior)
if [[ "${STATICRYPT_PASSWORD:-}" == "auto" ]]; then
  PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -d '=+/')
  echo -e "${GREEN}✓ Generated random password (shown once; you do not need to keep it):${NC}"
  echo -e "  ${PASSWORD}"
elif [[ -n "${STATICRYPT_PASSWORD:-}" ]]; then
  PASSWORD="$STATICRYPT_PASSWORD"
  echo -e "${GREEN}✓ Using password from STATICRYPT_PASSWORD${NC}"
else
  echo -e "${YELLOW}Enter the password for encryption (or rerun with STATICRYPT_PASSWORD=auto):${NC}"
  read -rs PASSWORD
  echo ""

  echo -e "${YELLOW}Confirm password:${NC}"
  read -rs PASSWORD_CONFIRM
  echo ""

  if [[ "$PASSWORD" != "$PASSWORD_CONFIRM" ]]; then
    echo -e "${RED}ERROR: Passwords do not match!${NC}"
    exit 1
  fi
  if [[ -z "$PASSWORD" ]]; then
    echo -e "${RED}ERROR: Password cannot be empty!${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Password confirmed${NC}"
fi

# staticrypt itself reads STATICRYPT_PASSWORD from the environment, which would
# override the -p flag (and use the literal string "auto"). Clear it.
unset STATICRYPT_PASSWORD
echo ""
echo -e "${BLUE}Starting encryption process...${NC}"
echo ""

ENCRYPTED_COUNT=0
FAILED_COUNT=0

# Optional: allow disabling remember UI via env var
#   STATICRYPT_REMEMBER=0 ./encrypt.sh
STATICRYPT_REMEMBER="${STATICRYPT_REMEMBER:-0}"

for file in "${HTML_FILES[@]}"; do
  echo -e "${BLUE}Processing: ${file}${NC}"

  # Backup of original file (pre-encryption)
  BACKUP_FILE=".backups/${file}.original.$(date +%Y%m%d_%H%M%S).html"
  cp "$file" "$BACKUP_FILE"
  echo -e "  ${GREEN}✓ Backup created: ${BACKUP_FILE}${NC}"

  # Build the staticrypt command args safely
  ARGS=()

  # Password (prefer -p if supported; otherwise fall back to legacy positional password)
  if [[ "$PASS_FLAG_SUPPORTED" -eq 1 ]]; then
    ARGS+=(-p "$PASSWORD")
  else
    ARGS+=("$PASSWORD")
  fi

  # Output directory (write back into this directory if supported)
  if [[ "$DIR_FLAG_SUPPORTED" -eq 1 ]]; then
    ARGS+=(-d "$SCRIPT_DIR")
  fi

  # Remember-me UI (only if supported)
  if [[ "$REMEMBER_FLAG_SUPPORTED" -eq 1 ]]; then
    ARGS+=(--remember "$STATICRYPT_REMEMBER")
  fi

  # Run encryption (do NOT suppress output; if it hangs, you'll see the prompt/error)
  if staticrypt "$file" "${ARGS[@]}"; then
    echo -e "  ${GREEN}✓ Encrypted successfully${NC}"
    ((++ENCRYPTED_COUNT))
  else
    echo -e "  ${RED}✗ Encryption failed${NC}"
    ((++FAILED_COUNT))
  fi

  echo ""
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Encryption Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Successfully encrypted: ${ENCRYPTED_COUNT} file(s)${NC}"
if [[ "$FAILED_COUNT" -gt 0 ]]; then
  echo -e "${RED}Failed: ${FAILED_COUNT} file(s)${NC}"
fi
echo -e "${BLUE}Backups saved in: .backups/${NC}"
echo ""

if [[ "$ENCRYPTED_COUNT" -gt 0 ]]; then
  # Derive the StatiCrypt key for the TOTP worker (see ../worker/README.md)
  if command -v node &>/dev/null && [[ -f "$SCRIPT_DIR/../worker/derive-key.mjs" && -f .staticrypt.json ]]; then
    DERIVED_KEY=$(node "$SCRIPT_DIR/../worker/derive-key.mjs" "$PASSWORD")
    echo -e "${BLUE}Derived StatiCrypt key (this is what the TOTP worker hands out):${NC}"
    echo -e "  ${DERIVED_KEY}"
    echo ""
    echo -e "${YELLOW}Store it in the worker:${NC}"
    echo -e "  cd ../worker && echo -n '${DERIVED_KEY}' | wrangler secret put STATICRYPT_KEY"
    echo ""
  else
    echo -e "${YELLOW}⚠ Could not derive the TOTP worker key (need node, ../worker/derive-key.mjs, and .staticrypt.json).${NC}"
    echo ""
  fi

  echo -e "${YELLOW}IMPORTANT NOTES:${NC}"
  echo -e "1. Original files have been backed up to .backups/"
  echo -e "2. Commit + push the encrypted HTML files (otherwise GitHub will still show plaintext)"
  echo -e "3. Commit .staticrypt.json - the salt must stay stable so one key opens all files"
  echo -e "4. After changing the password, update the STATICRYPT_KEY worker secret (command above)"
  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo -e "  git status"
  echo -e "  git add ."
  echo -e "  git commit -m \"Encrypt private materials\""
  echo -e "  git push"
  echo ""
fi

echo -e "${GREEN}Done!${NC}"


