ALTER TABLE users
    ADD COLUMN IF NOT EXISTS base_currency VARCHAR(10) NOT NULL DEFAULT 'USD';

ALTER TABLE account
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE account SET currency = 'USD' WHERE currency IS NULL;

ALTER TABLE account
    ALTER COLUMN currency SET NOT NULL;

ALTER TABLE transaction
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE transaction SET currency = 'USD' WHERE currency IS NULL;

ALTER TABLE transaction
    ALTER COLUMN currency SET NOT NULL;

ALTER TABLE budget_categories
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE budget_categories SET currency = 'USD' WHERE currency IS NULL;

ALTER TABLE budget_categories
    ALTER COLUMN currency SET NOT NULL;

ALTER TABLE budget
    ADD COLUMN IF NOT EXISTS base_currency VARCHAR(10);

UPDATE budget
SET base_currency = COALESCE(base_currency, 'USD');

CREATE TABLE IF NOT EXISTS currency_rate (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    rate_date DATE NOT NULL,
    rate NUMERIC(19, 6) NOT NULL,
    manual BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uk_currency_rate_user_currency_date UNIQUE (user_id, currency, rate_date)
);
