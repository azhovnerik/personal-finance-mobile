CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

create table verification_token
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    token   varchar(255),
    user_id  uuid not null,
    expiry_date timestamp
);

CREATE INDEX verification_token_token
    ON verification_token (token);
