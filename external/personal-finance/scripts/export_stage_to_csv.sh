#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but was not found in PATH" >&2
  exit 1
fi

: "${STAGE_DATABASE_URL:?STAGE_DATABASE_URL must be set to the Heroku stage database URL (e.g. postgres://...) }"

OUTPUT_DIR="${1:-exported-stage-data}"
mkdir -p "$OUTPUT_DIR"

TABLES=(
  users
  category
  budget
  account
  change_balance
  transaction
  budget_categories
)

for table in "${TABLES[@]}"; do
  quoted_table="\"${table}\""
  output_file="$OUTPUT_DIR/${table}.csv"
  echo "Exporting ${table} to ${output_file}" >&2
  psql "$STAGE_DATABASE_URL" \
    --set=ON_ERROR_STOP=1 \
    --command "\\COPY (SELECT * FROM ${quoted_table} ORDER BY id) TO STDOUT WITH (FORMAT csv, HEADER, FORCE_QUOTE *)" \
    >"$output_file"
  echo "  -> $(wc -l <"$output_file") rows written" >&2
  chmod 600 "$output_file"
done

echo "Export completed. Files are located in $OUTPUT_DIR" >&2
