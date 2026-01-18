UPDATE subscription_plan
SET code = 'STANDART_MONTHLY',
    type = 'STANDART_MONTHLY',
    trial_available = FALSE,
    trial_period_days = NULL
WHERE code = 'STANDARD_MONTHLY';

UPDATE subscription_plan
SET code = 'STANDART_YEARLY',
    type = 'STANDART_YEARLY',
    trial_available = FALSE,
    trial_period_days = NULL
WHERE code = 'STANDARD_YEARLY';

INSERT INTO subscription_plan (id, code, type, billing_period, price, currency, trial_available, trial_period_days, is_active)
VALUES (gen_random_uuid(), 'TRIAL', 'TRIAL', 'MONTHLY', 0.00, 'USD', FALSE, 30, TRUE);
