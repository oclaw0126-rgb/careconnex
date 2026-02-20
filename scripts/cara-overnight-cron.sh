#!/bin/bash
# Cara Overnight Agent - Runs every night at 11 PM PST
# Triggers the overnight jobs endpoint on Railway

curl -X POST https://careconnex-production.up.railway.app/agents/overnight \
  -H "Content-Type: application/json" \
  -d '{}' \
  --silent

echo "Cara overnight jobs triggered at $(date)"
