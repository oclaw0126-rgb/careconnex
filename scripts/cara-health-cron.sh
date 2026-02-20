#!/bin/bash
# Cara Health Analysis - Runs daily at 8 AM PST
# Analyzes all seniors' health data and sends alerts

curl -X POST https://careconnex-production.up.railway.app/health/analyze-all \
  -H "Content-Type: application/json" \
  -d '{}' \
  --silent

echo "Health analysis triggered at $(date)"
