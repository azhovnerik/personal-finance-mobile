CREATE TABLE transfer
(
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL,
    from_account_id UUID        NOT NULL,
    to_account_id   UUID        NOT NULL,
    date            BIGINT,
    comment         VARCHAR(255)
);

CREATE INDEX transfer_user_id_idx
    ON transfer (user_id);

CREATE INDEX transfer_from_account_id_idx
    ON transfer (from_account_id);

CREATE INDEX transfer_to_account_id_idx
    ON transfer (to_account_id);

ALTER TABLE transfer
    ADD CONSTRAINT fk_transfer_user FOREIGN KEY (user_id) REFERENCES users;

ALTER TABLE transfer
    ADD CONSTRAINT fk_transfer_from_account FOREIGN KEY (from_account_id) REFERENCES account;

ALTER TABLE transfer
    ADD CONSTRAINT fk_transfer_to_account FOREIGN KEY (to_account_id) REFERENCES account;

ALTER TABLE transaction
    ADD COLUMN transfer_id UUID;

ALTER TABLE transaction
    ADD CONSTRAINT fk_transfer FOREIGN KEY (transfer_id) REFERENCES transfer;
