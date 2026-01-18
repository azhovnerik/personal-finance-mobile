ALTER TABLE users
    ADD COLUMN interface_language VARCHAR(10);

ALTER TABLE users
    ADD COLUMN country_code VARCHAR(2);

ALTER TABLE users
    ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
    ADD COLUMN lockout_until TIMESTAMP;
