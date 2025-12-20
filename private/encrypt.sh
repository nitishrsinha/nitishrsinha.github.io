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

# Find HTML files to encrypt (excluding already-encrypted-named files)
mapfile -t HTML_FILES < <(find . -maxdepth 1 -type f -name "*.html" ! -name "*.encrypted.html" -printf "%f\n" | sort)
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

# Prompt for password
echo -e "${YELLOW}Enter the password for encryption:${NC}"
read -rs PASSWORD
echo ""

# Confirm password
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
  echo -e "${YELLOW}IMPORTANT NOTES:${NC}"
  echo -e "1. Original files have been backed up to .backups/"
  echo -e "2. Commit + push the encrypted HTML files (otherwise GitHub will still show plaintext)"
  echo -e "3. If .staticrypt.json appears, consider committing it (keeps salts stable between runs)"
  echo -e "4. ${RED}Keep the password secure - there is no recovery if lost!${NC}"
  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo -e "  git status"
  echo -e "  git add ."
  echo -e "  git commit -m \"Encrypt private materials\""
  echo -e "  git push"
  echo ""
fi

echo -e "${GREEN}Done!${NC}"


