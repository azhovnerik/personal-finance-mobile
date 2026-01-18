CREATE TABLE subscription_event_log (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id UUID REFERENCES user_subscription(id),
    event_type VARCHAR(32) NOT NULL,
    order_id VARCHAR(255),
    message VARCHAR(1000),
    context TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_subscription_event_log_user ON subscription_event_log(user_id);
CREATE INDEX idx_subscription_event_log_subscription ON subscription_event_log(subscription_id);
CREATE INDEX idx_subscription_event_log_created_at ON subscription_event_log(created_at);
