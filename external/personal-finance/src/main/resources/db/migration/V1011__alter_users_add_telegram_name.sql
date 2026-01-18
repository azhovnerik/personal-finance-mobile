ALTER TABLE users
    ADD COLUMN telegram_name varchar(255);
ALTER TABLE  if exists users add constraint telegram_name_constraint unique (telegram_name);
CREATE INDEX user_telegram_name
    ON users (telegram_name);
