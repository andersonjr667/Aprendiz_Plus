#!/usr/bin/env bash
# Simple helper to POST seed credentials to the local server and print the JSON responses.
# Usage: ensure the app is running on http://localhost:3000 and the DB is seeded (run node scripts/seed.js).
# Then: chmod +x scripts/get-tokens.sh && ./scripts/get-tokens.sh

HOST=${HOST:-localhost}
PORT=${PORT:-3000}
BASE_URL="http://$HOST:$PORT/api/auth/login"

declare -a CREDS=(
  '"email":"alsj1520@gmail.com","password":"password123"'  # Owner (seed)
  '"email":"admin@local","password":"password123"'         # Admin (seed)
  '"email":"a@empresa","password":"password123"'           # Empresa A (seed)
  '"email":"c1@local","password":"password123"'           # Candidate 1 (seed)
)

echo "Requesting tokens from $BASE_URL"

for c in "${CREDS[@]}"; do
  # Extract email for display
  email=$(echo "$c" | sed -n 's/.*"email":"\([^"]*\)".*/\1/p')
  echo "\n--- Login: $email ---"
  resp=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL" -H "Content-Type: application/json" -d "{${c}}" )
  body=$(echo "$resp" | sed -e 's/HTTP_STATUS:.*//g')
  status=$(echo "$resp" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')
  echo "HTTP status: $status"
  echo "Response body:"
  echo "$body" | jq . 2>/dev/null || echo "$body"
done

echo "\nDone. If you see a token in the JSON responses (field 'token'), copy it for authenticated tests." 