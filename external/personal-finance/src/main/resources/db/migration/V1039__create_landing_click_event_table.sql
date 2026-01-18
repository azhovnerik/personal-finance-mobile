CREATE TABLE landing_click_event
(
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clicked_at   TIMESTAMPTZ NOT NULL,
    country_code VARCHAR(32)  NOT NULL,
    ip_address   VARCHAR(64)  NOT NULL,
    device_type  VARCHAR(32)  NOT NULL,
    received_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX landing_click_event_clicked_at_idx ON landing_click_event (clicked_at);
CREATE INDEX landing_click_event_ip_address_idx ON landing_click_event (ip_address);
