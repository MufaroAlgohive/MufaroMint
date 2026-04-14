#!/usr/bin/env bash
# ============================================================
# Apply returns-engine schema migrations in dependency order.
#
# Usage:
#   ./scripts/sql/run-returns-engine-migrations.sh
#
# Requires:
#   SUPABASE_DB_URL  — postgres connection string, e.g.:
#   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
#
# Or paste each .sql file directly into the Supabase SQL editor.
# ============================================================

set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set."
  echo "Export it first:  export SUPABASE_DB_URL='postgresql://...'"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_migration() {
  local file="$1"
  echo ""
  echo "▶ Running: $file"
  psql "$SUPABASE_DB_URL" -f "$file"
  echo "✓ Done: $file"
}

# Order matters — security_metrics references securities which must exist first.
# reference_dates also references securities.
run_migration "$SCRIPT_DIR/create-reference-dates.sql"
run_migration "$SCRIPT_DIR/create-security-metrics.sql"

echo ""
echo "════════════════════════════════════════════════"
echo "  All returns-engine migrations applied. ✓"
echo "════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Backfill reference_dates for each period (ytd, 1w, 1m, 3m, 6m, 1y)"
echo "     by joining security_prices on the relevant anchor dates."
echo "  2. Backfill security_metrics from existing security_prices rows."
echo "  3. Schedule a nightly job to INSERT INTO security_metrics and"
echo "     UPSERT INTO reference_dates after market close."
