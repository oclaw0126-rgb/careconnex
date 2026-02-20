#!/bin/bash
# Cara Weekly Learning - Runs every Sunday at 2 AM PST
# Improves matching algorithm based on feedback

curl -X POST https://careconnex-production.up.railway.app/matching/weekly-learning \
  -H "Content-Type: application/json" \
  -d '{}' \
  --silent

echo "Weekly learning triggered at $(date)"
