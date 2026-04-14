#!/bin/bash

# ============================================================================
# Script: run_daily_metrics.sh
# Purpose: Execute daily strategy metrics calculation
# Usage: ./run_daily_metrics.sh [DATE]
# Example: ./run_daily_metrics.sh 2024-04-14
# ============================================================================

set -e

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mint}"
DB_USER="${DB_USER:-postgres}"

# Use provided date or default to yesterday (since markets close in evening)
TARGET_DATE="${1:-$(date -d 'yesterday' '+%Y-%m-%d')}"

# Log file
LOG_DIR="${LOG_DIR:-.}"
LOG_FILE="${LOG_DIR}/strategy_metrics_$(date +%Y%m%d_%H%M%S).log"

# Functions
log_info() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE"
}

# Main execution
{
  log_info "Starting daily metrics calculation for $TARGET_DATE"

  # Execute the SQL function
  RESULT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT strategy_id, metrics_inserted FROM calculate_daily_strategy_metrics('$TARGET_DATE'::DATE);" 2>&1)

  if [ $? -eq 0 ]; then
    log_info "Metrics calculated successfully"
    log_info "Results: $RESULT"
  else
    log_error "Failed to calculate metrics: $RESULT"
    exit 1
  fi

  log_info "Daily metrics calculation complete"
} >> "$LOG_FILE" 2>&1

exit 0
