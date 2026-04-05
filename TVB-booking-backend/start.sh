#!/bin/sh
set -e

if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  echo "$GOOGLE_CREDENTIALS_JSON" | base64 -d > /app/google-cred.json
  echo "google-cred.json written from GOOGLE_CREDENTIALS_JSON"
fi

exec bun run src/index.ts
