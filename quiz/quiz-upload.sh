#!/bin/bash
# Upload (or replace) one quiz definition: ./quiz-upload.sh week02
# Reads quizzes/<week>.json. Existing submissions are kept and re-scored.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
WEEK="${1:?Usage: ./quiz-upload.sh weekNN}"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' "quizzes/$WEEK.json"
npx --yes wrangler@4 kv key put --binding=QUIZ --remote "def:$WEEK" --path "quizzes/$WEEK.json"
echo "Uploaded $WEEK"
