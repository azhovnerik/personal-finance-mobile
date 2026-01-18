CREATE TABLE subscription_plan (
    id UUID PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL,
    billing_period VARCHAR(32) NOT NULL,
    price NUMERIC(8, 2) NOT NULL,
    currency VARCHAR(16) NOT NULL,
    trial_available BOOLEAN NOT NULL DEFAULT FALSE,
    trial_period_days INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE user_subscription (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES subscription_plan(id),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    trial_started_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    current_period_started_at TIMESTAMP,
    current_period_ends_at TIMESTAMP,
    next_billing_at TIMESTAMP,
    payment_customer_token VARCHAR(255),
    payment_subscription_id VARCHAR(255),
    auto_renew BOOLEAN DEFAULT FALSE,
    trial_reminder_sent_at TIMESTAMP,
    trial_expired_notified_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_effective_at TIMESTAMP
);

CREATE TABLE subscription_cancellation (
    id UUID PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES user_subscription(id) ON DELETE CASCADE,
    reason_type VARCHAR(64) NOT NULL,
    additional_details VARCHAR(1000),
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_subscription_user ON user_subscription(user_id);
CREATE INDEX idx_user_subscription_plan ON user_subscription(plan_id);
CREATE INDEX idx_user_subscription_status ON user_subscription(status);
CREATE INDEX idx_subscription_cancellation_subscription ON subscription_cancellation(subscription_id);

INSERT INTO subscription_plan (id, code, type, billing_period, price, currency, trial_available, trial_period_days, is_active)
VALUES
    (gen_random_uuid(), 'STANDARD_MONTHLY', 'STANDARD', 'MONTHLY', 10.00, 'USD', TRUE, 30, TRUE),
    (gen_random_uuid(), 'STANDARD_YEARLY', 'STANDARD', 'YEARLY', 99.00, 'USD', TRUE, 30, TRUE);
