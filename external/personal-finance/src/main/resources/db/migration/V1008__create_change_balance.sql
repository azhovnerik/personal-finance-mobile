create table change_balance
(
    id          int8         not null,
    user_id     int8         not null,
    date        int8        not null,
    account_id  int8         not null,
    new_balance      numeric(19,2)      not null,
    comment     varchar(255),
    primary key (id)
);

CREATE INDEX change_balance_user_id
    ON change_balance (user_id);
CREATE INDEX change_balance_account_id
    ON change_balance (account_id);

ALTER TABLE change_balance
    add constraint fk_user foreign key (user_id) references users;
ALTER TABLE change_balance
    add constraint fk_account foreign key (account_id) references account;
