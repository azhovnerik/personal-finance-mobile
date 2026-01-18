create table transaction
(
    id          int8         not null,
    user_id     int8         not null,
    date        int8        not null,
    category_id int8         not null,
    account_id  int8         not null,
    amount      numeric(19,2)      not null,
    comment     varchar(255),
    primary key (id)
);

CREATE INDEX transactions_user_id
    ON transaction (user_id);
CREATE INDEX transactions_category_id
    ON transaction (category_id);
CREATE INDEX transactions_account_id
    ON transaction (account_id);

ALTER TABLE transaction
    add constraint fk_category foreign key (category_id) references category;
ALTER TABLE transaction
    add constraint fk_user foreign key (user_id) references users;
ALTER TABLE transaction
    add constraint fk_account foreign key (account_id) references account;
