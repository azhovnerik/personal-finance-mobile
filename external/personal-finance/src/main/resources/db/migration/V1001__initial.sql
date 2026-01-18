create sequence hibernate_sequence start 1 increment 1;
create table users
(
    id       int8         not null,
    email    varchar(255),
    name     varchar(255) not null,
    password varchar(255),
    role     varchar(255),
    status   varchar(255),
    primary key (id)
);
alter table if exists users add constraint UK_3g1j96g94xpk3lpxl2qbl985x unique (name);
CREATE INDEX user_name
    ON users (name);

create table budget
(
    id            int8   not null,
    month         date,
    status        varchar(255),
    total_expense float8 not null,
    total_income  float8 not null,
    user_id       int8,
    primary key (id)
);
alter table if exists budget add constraint fk_user foreign key (user_id) references users;
CREATE INDEX budget_user_id
    ON budget (user_id);
CREATE INDEX budget_user_id_month
    ON budget (user_id, month);

create table category
(
    id          int8 not null,
    description varchar(255),
    name        varchar(255),
    parent_id   int8,
    type        varchar(255),
    user_id     int8,
    primary key (id)
);
alter table if exists category add constraint fk_user foreign key (user_id) references users;
CREATE INDEX category_user_id
    ON category (user_id);
