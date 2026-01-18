WITH trial_plan AS (
    SELECT id, COALESCE(NULLIF(trial_period_days, 0), 30) AS trial_days
    FROM subscription_plan
    WHERE code = 'TRIAL'
),
eligible_users AS (
    SELECT u.id
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1
        FROM user_subscription us
        WHERE us.user_id = u.id
    )
)
INSERT INTO user_subscription (
    id,
    user_id,
    plan_id,
    status,
    created_at,
    updated_at,
    trial_started_at,
    trial_ends_at,
    auto_renew
)
SELECT
    gen_random_uuid(),
    eu.id,
    tp.id,
    'TRIAL',
    now(),
    now(),
    now(),
    now() + make_interval(days => tp.trial_days),
    FALSE
FROM eligible_users eu
CROSS JOIN trial_plan tp;
