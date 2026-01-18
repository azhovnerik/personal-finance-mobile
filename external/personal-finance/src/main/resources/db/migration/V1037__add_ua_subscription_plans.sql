INSERT INTO subscription_plan (id, code, type, billing_period, price, currency, trial_available, trial_period_days, is_active)
VALUES
    (gen_random_uuid(), 'STANDART_MONTHLY_UA', 'STANDART_MONTHLY_UA', 'MONTHLY', 420.00, 'UAH', FALSE, NULL, TRUE),
    (gen_random_uuid(), 'STANDART_YEARLY_UA', 'STANDART_YEARLY_UA', 'YEARLY', 3530.00, 'UAH', FALSE, NULL, TRUE);
