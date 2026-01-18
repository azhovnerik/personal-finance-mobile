#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but was not found in PATH" >&2
  exit 1
fi

: "${FEATURE_DATABASE_URL:?FEATURE_DATABASE_URL must be set to the target Heroku database URL}" 

DATA_DIR="${1:-exported-stage-data}"
if [[ ! -d "$DATA_DIR" ]]; then
  echo "Data directory '$DATA_DIR' does not exist" >&2
  exit 1
fi

required_files=(
  users.csv
  category.csv
  budget.csv
  account.csv
  change_balance.csv
  transaction.csv
  budget_categories.csv
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$DATA_DIR/$file" ]]; then
    echo "Missing required CSV file: $DATA_DIR/$file" >&2
    exit 1
  fi
done

ABS_DIR="$(cd "$DATA_DIR" && pwd)"

psql "$FEATURE_DATABASE_URL" \
  --set=ON_ERROR_STOP=1 \
  <<SQL
\set ON_ERROR_STOP on
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ensure clean target tables
TRUNCATE TABLE budget_categories, "transaction", change_balance, budget, account, category, users RESTART IDENTITY CASCADE;

CREATE OR REPLACE FUNCTION legacy_uuid(prefix text, legacy bigint)
RETURNS uuid
LANGUAGE SQL
IMMUTABLE
AS \$\$
    SELECT CASE
             WHEN legacy IS NULL THEN NULL
             ELSE uuid_generate_v5('75f1bd71-8e5f-4b36-94f5-8d2c85ee5c4b'::uuid, prefix || legacy::text)
           END;
\$\$;

CREATE TEMP TABLE stage_users (
    id BIGINT PRIMARY KEY,
    email TEXT,
    name TEXT,
    password TEXT,
    role TEXT,
    status TEXT,
    telegram_name TEXT,
    verified BOOLEAN,
    pending_email TEXT,
    pending_email_requested_at TIMESTAMP,
    base_currency VARCHAR(10)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_category (
    id BIGINT PRIMARY KEY,
    parent_id BIGINT,
    name TEXT,
    description TEXT,
    user_id BIGINT,
    type TEXT,
    disabled BOOLEAN,
    icon VARCHAR(50),
    category_template_id UUID
) ON COMMIT DROP;

CREATE TEMP TABLE stage_budget (
    id BIGINT PRIMARY KEY,
    month DATE,
    status TEXT,
    total_expense NUMERIC(19,2),
    total_income NUMERIC(19,2),
    user_id BIGINT,
    base_currency VARCHAR(10)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_account (
    id BIGINT PRIMARY KEY,
    description TEXT,
    name TEXT,
    type TEXT,
    user_id BIGINT,
    currency VARCHAR(10)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_change_balance (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    date BIGINT,
    account_id BIGINT,
    new_balance NUMERIC(19,2),
    comment TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE stage_transaction (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    date BIGINT,
    category_id BIGINT,
    account_id BIGINT,
    amount NUMERIC(19,2),
    comment TEXT,
    change_balance_id BIGINT,
    type TEXT,
    direction TEXT,
    currency VARCHAR(10)
) ON COMMIT DROP;

CREATE TEMP TABLE stage_budget_categories (
    id BIGINT PRIMARY KEY,
    budget_id BIGINT,
    category_id BIGINT,
    type TEXT,
    amount NUMERIC(19,2),
    comment TEXT,
    currency VARCHAR(10)
) ON COMMIT DROP;

\echo VAR_CHECK_START
\echo users_csv=${ABS_DIR}/users.csv
\echo category_csv=${ABS_DIR}/category.csv
\echo budget_csv=${ABS_DIR}/budget.csv
\echo account_csv=${ABS_DIR}/account.csv
\echo change_balance_csv=${ABS_DIR}/change_balance.csv
\echo transaction_csv=${ABS_DIR}/transaction.csv
\echo budget_categories_csv=${ABS_DIR}/budget_categories.csv
\echo VAR_CHECK_END

\copy stage_users (id, email, name, password, role, status, telegram_name) FROM '${ABS_DIR}/users.csv' WITH (FORMAT csv, HEADER, NULL '');
\copy stage_category (id, description, name, parent_id, type, user_id, disabled) FROM '${ABS_DIR}/category.csv' WITH (FORMAT csv, HEADER, NULL '');
\copy stage_budget (id, month, status, total_expense, total_income, user_id) FROM '${ABS_DIR}/budget.csv' WITH (FORMAT csv, HEADER, NULL '');
\copy stage_account (id, description, name, type, user_id) FROM '${ABS_DIR}/account.csv' WITH (FORMAT csv, HEADER, NULL '');
\copy stage_change_balance (id, user_id, date, account_id, new_balance, comment) FROM '${ABS_DIR}/change_balance.csv' WITH (FORMAT csv, HEADER, NULL '');
\copy stage_transaction (id, user_id, date, category_id, account_id, amount, comment, change_balance_id, type, direction) FROM '${ABS_DIR}/transaction.csv' WITH (FORMAT csv, HEADER, NULL '');
\copy stage_budget_categories (id, budget_id, category_id, type, amount, comment) FROM '${ABS_DIR}/budget_categories.csv' WITH (FORMAT csv, HEADER, NULL '');

INSERT INTO users (id, email, name, password, role, status, telegram_name, verified, pending_email, pending_email_requested_at, base_currency)
SELECT legacy_uuid('users:', id), email, name, password, role, status, telegram_name, COALESCE(verified, FALSE), pending_email, pending_email_requested_at, COALESCE(base_currency, 'USD')
FROM stage_users
ORDER BY id;

WITH RECURSIVE ordered_category AS (
    SELECT sc.*, 0 AS depth
    FROM stage_category sc
    WHERE sc.parent_id IS NULL
  UNION ALL
    SELECT sc.*, oc.depth + 1 AS depth
    FROM stage_category sc
    JOIN ordered_category oc ON sc.parent_id = oc.id
)
INSERT INTO category (id, parent_id, name, description, user_id, type, disabled, icon, category_template_id)
SELECT legacy_uuid('category:', id), legacy_uuid('category:', parent_id), name, description, legacy_uuid('users:', user_id), type, COALESCE(disabled, FALSE), icon, category_template_id
FROM ordered_category
ORDER BY depth, id
ON CONFLICT (id) DO NOTHING;

INSERT INTO account (id, description, name, type, user_id, currency)
SELECT 
  legacy_uuid('account:', sa.id),
  sa.description,
  sa.name,
  sa.type,
  legacy_uuid('users:', sa.user_id),
  COALESCE(sa.currency, u.base_currency, 'USD')
FROM stage_account sa
JOIN users u ON u.id = legacy_uuid('users:', sa.user_id)
ORDER BY sa.id;

INSERT INTO budget (id, month, status, total_expense, total_income, user_id, base_currency)
SELECT legacy_uuid('budget:', id), month, status, total_expense, total_income, legacy_uuid('users:', user_id), COALESCE(base_currency, 'USD')
FROM stage_budget
ORDER BY id;

INSERT INTO change_balance (id, user_id, date, account_id, new_balance, comment)
SELECT legacy_uuid('change_balance:', id), legacy_uuid('users:', user_id), date, legacy_uuid('account:', account_id), new_balance, comment
FROM stage_change_balance
ORDER BY id;

INSERT INTO "transaction" (id, user_id, date, category_id, account_id, amount, comment, change_balance_id, type, direction, currency)
SELECT 
  legacy_uuid('transaction:', st.id),
  legacy_uuid('users:', st.user_id),
  st.date,
  legacy_uuid('category:', st.category_id),
  legacy_uuid('account:', st.account_id),
  st.amount,
  st.comment,
  legacy_uuid('change_balance:', st.change_balance_id),
  st.type,
  st.direction,
  a.currency
FROM stage_transaction st
JOIN account a ON a.id = legacy_uuid('account:', st.account_id)
ORDER BY st.id;

INSERT INTO budget_categories (id, budget_id, category_id, type, amount, comment, currency)
SELECT 
  legacy_uuid('budget_categories:', sbc.id),
  legacy_uuid('budget:', sbc.budget_id),
  legacy_uuid('category:', sbc.category_id),
  sbc.type,
  sbc.amount,
  sbc.comment,
  b.base_currency
FROM stage_budget_categories sbc
JOIN budget b ON b.id = legacy_uuid('budget:', sbc.budget_id)
ORDER BY sbc.id;

DROP FUNCTION IF EXISTS legacy_uuid(text, bigint);

COMMIT;
SQL

echo "Import completed successfully" >&2
