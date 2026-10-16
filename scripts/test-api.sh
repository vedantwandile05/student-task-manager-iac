#!/usr/bin/env bash
# Usage: ./scripts/test-api.sh https://student-task-manager-dev.<subdomain>.workers.dev
set -euo pipefail
BASE="${1:?Pass the application URL as the first argument}"

echo "== Test 1: Create task"
CREATED=$(curl -s -X POST "$BASE/api/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Prepare Final Year Project Presentation","priority":"High","status":"Pending"}')
echo "$CREATED"
ID=$(echo "$CREATED" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

echo; echo "== Test 2: Read task $ID"
curl -s "$BASE/api/tasks/$ID"

echo; echo; echo "== Test 2b: List all tasks"
curl -s "$BASE/api/tasks"

echo; echo; echo "== Test 3: Update status to Completed"
curl -s -X PUT "$BASE/api/tasks/$ID" -H 'Content-Type: application/json' -d '{"status":"Completed"}'

echo; echo; echo "== Test 4: Delete task"
curl -s -X DELETE "$BASE/api/tasks/$ID"

echo; echo; echo "== Verify deletion (expect 404)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/tasks/$ID"
