#!/bin/bash
set -euo pipefail

# Health Check Script
# Validates all Quant platform services are responding.
#
# Usage: ./health-check.sh [--base-url <url>]
#
# Options:
#   --base-url   Base URL for service endpoints (default: http://localhost)

BASE_URL="${BASE_URL:-http://localhost}"
TIMEOUT=5
FAILED=0
TOTAL=0

# Service definitions: name:port
declare -a SERVICES=(
  "identity:3001"
  "chat-api:3002"
  "mail-api:3001"
  "ai-api:3020"
  "sync-api:3004"
  "ads-api:3005"
  "tube-api:3006"
  "neon-api:3007"
  "edits-api:3008"
  "max-api:3009"
  "ws-gateway:8080"
)

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--base-url <url>]"
      echo ""
      echo "Options:"
      echo "  --base-url   Base URL for service endpoints (default: http://localhost)"
      echo ""
      echo "Environment variables:"
      echo "  BASE_URL     Alternative to --base-url flag"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "============================================"
echo " Quant Platform Health Check"
echo " Base URL: ${BASE_URL}"
echo " Timeout:  ${TIMEOUT}s per request"
echo "============================================"
echo ""

printf "%-15s %-8s %-10s %s\n" "SERVICE" "PORT" "STATUS" "RESPONSE TIME"
printf "%-15s %-8s %-10s %s\n" "-------" "----" "------" "-------------"

for service_def in "${SERVICES[@]}"; do
  SERVICE_NAME="${service_def%%:*}"
  SERVICE_PORT="${service_def##*:}"
  TOTAL=$((TOTAL + 1))

  URL="${BASE_URL}:${SERVICE_PORT}/health"

  # Perform health check
  START_TIME=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "000")
  END_TIME=$(date +%s%N)

  # Calculate response time in ms
  ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))

  if [[ "$HTTP_CODE" == "200" ]]; then
    STATUS="UP"
    COLOR="\033[0;32m"
  else
    STATUS="DOWN"
    COLOR="\033[0;31m"
    FAILED=$((FAILED + 1))
  fi

  RESET="\033[0m"
  printf "%-15s %-8s ${COLOR}%-10s${RESET} %sms (HTTP %s)\n" "$SERVICE_NAME" "$SERVICE_PORT" "$STATUS" "$ELAPSED_MS" "$HTTP_CODE"
done

echo ""
echo "============================================"
echo " Results: $((TOTAL - FAILED))/${TOTAL} services healthy"
echo "============================================"

if [[ $FAILED -gt 0 ]]; then
  echo ""
  echo "WARNING: ${FAILED} service(s) are unhealthy!"
  exit 1
fi

echo ""
echo "All services are healthy."
exit 0
