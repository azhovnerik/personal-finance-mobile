create table account
(
    id          int8 not null,
    description varchar(255),
    name        varchar(255),
    type        varchar(255),
    user_id     int8,
    primary key (id)
);
alter table if exists account add constraint fk_user foreign key (user_id) references users;
CREATE INDEX account_user_id
    ON category (user_id);
