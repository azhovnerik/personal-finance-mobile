ALTER TABLE subscription_plan
    ADD COLUMN old_price NUMERIC(8, 2) NOT NULL DEFAULT 0;
