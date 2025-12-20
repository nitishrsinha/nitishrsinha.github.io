#!/bin/bash

#########################################################
# StatiCrypt Encryption Script for Protected Content
#
# This script encrypts HTML files in the /private directory
# using StatiCrypt (AES-256).
#
# Usage: ./encrypt.sh
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

# Check if staticrypt is installed
if ! command -v staticrypt &> /dev/null; then
  echo -e "${RED}ERROR: StatiCrypt is not installed!${NC}"
  echo ""
  echo -e "${YELLOW}To install StatiCrypt, run:${NC}"
  echo -e "  ${GREEN}npm install -g staticrypt${NC}"
  echo ""
  echo "After installation, run this script again."
  exit 1
fi

echo -e "${GREEN}✓ StatiCrypt is installed${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Working directory: ${SCRIPT_DIR}${NC}"
echo ""

# Count HTML files to encrypt (excluding already encrypted files)
mapfile -t HTML_FILES < <(find . -maxdepth 1 -name "*.html" -type f ! -name "*.encrypted.html" -printf "%f\n" | sort)
NUM_FILES=${#HTML_FILES[@]}

if [[ "$NUM_FILES" -eq 0 ]]; then
  echo -e "${YELLOW}No HTML files found to encrypt in this directory.${NC}"
  echo ""
  echo "Make sure you have .html files in the /private directory."
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

# Create backup directory if it doesn't exist
mkdir -p .backups

ENCRYPTED_COUNT=0
FAILED_COUNT=0

# Encrypt each HTML file
for file in "${HTML_FILES[@]}"; do
  echo -e "${BLUE}Processing: ${file}${NC}"

  # Create backup of original file
  BACKUP_FILE=".backups/${file}.original.$(date +%Y%m%d_%H%M%S).html"
  cp "$file" "$BACKUP_FILE"
  echo -e "  ${GREEN}✓ Backup created: ${BACKUP_FILE}${NC}"

  # Encrypt the file
  # -p: pass password non-interactively (prevents hidden prompts)
  # -d: write output back into this directory (effectively "in place")
  # --remember 0: don't show "remember me" checkbox / session persistence (stable behavior)
  #
  # NOTE: StatiCrypt may create .staticrypt.json for consistent salts; consider committing it.
  if staticrypt "$file" -p "$PASSWORD" -d "$SCRIPT_DIR" --remember 0; then
    echo -e "  ${GREEN}✓ Encrypted successfully${NC}"
    ((++ENCRYPTED_COUNT))
  else
    echo -e "  ${RED}✗ Encryption failed${NC}"
    ((++FAILED_COUNT))
  fi

  echo ""
done

# Summary
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
  echo -e "1. Original files have been backed up to .backups/ directory"
  echo -e "2. Encrypted output was written to: ${SCRIPT_DIR}"
  echo -e "3. Remember-me UI is disabled (--remember 0)"
  echo -e "4. Consider committing .staticrypt.json if it appears (keeps salts stable)"
  echo -e "5. ${RED}Keep the password secure - there is no recovery if lost!${NC}"
  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo -e "  git add ."
  echo -e "  git commit -m \"Encrypt private research materials\""
  echo -e "  git push"
  echo ""
fi

echo -e "${GREEN}Done!${NC}"
