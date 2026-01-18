CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--  Dropping and recreating the default column value is required because
--  the default INT value is not compatible with the new column type.

ALTER TABLE transaction
    drop constraint fk_account;
ALTER TABLE change_balance
    drop constraint if exists fk_account;


ALTER TABLE account
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE transaction
    drop constraint if exists fk_change_balance;

ALTER TABLE transaction
    alter column account_id SET DATA TYPE UUID USING uuid_generate_v4();
ALTER TABLE transaction
    add constraint fk_account foreign key (account_id) references account;
ALTER TABLE transaction
    alter column change_balance_id SET DATA TYPE UUID USING uuid_generate_v4();

ALTER TABLE change_balance
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE transaction
    add constraint fk_change_balance foreign key (change_balance_id) references change_balance;

ALTER TABLE change_balance
    alter column account_id SET DATA TYPE UUID USING uuid_generate_v4();
ALTER TABLE change_balance
    add constraint fk_account foreign key (account_id) references account;


ALTER TABLE transaction
    drop constraint if exists fk_user;
ALTER TABLE budget
    drop constraint if exists fk_user;
ALTER TABLE category
    drop constraint if exists fk_user;
ALTER TABLE account
    drop constraint if exists fk_user;
ALTER TABLE change_balance
    drop constraint if exists fk_user;
ALTER TABLE users
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE account
    alter column user_id SET DATA TYPE UUID USING uuid_generate_v4();

ALTER TABLE account
    add constraint fk_user foreign key (user_id) references users;

ALTER TABLE transaction
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE transaction
    alter column user_id SET DATA TYPE UUID USING uuid_generate_v4();

ALTER TABLE transaction
    add constraint fk_user foreign key (user_id) references users;
ALTER TABLE budget
    alter column user_id SET DATA TYPE UUID USING uuid_generate_v4();
ALTER TABLE budget
    add constraint fk_user foreign key (user_id) references users;
ALTER TABLE category
    alter column user_id SET DATA TYPE UUID USING uuid_generate_v4();
ALTER TABLE category
    add constraint fk_user foreign key (user_id) references users;
ALTER TABLE change_balance
    alter column user_id SET DATA TYPE UUID USING uuid_generate_v4();
ALTER TABLE change_balance
    add constraint fk_user foreign key (user_id) references users;



ALTER TABLE category
    drop constraint fk_category;


ALTER TABLE transaction
    drop constraint if exists fk_category;

ALTER TABLE budget_categories
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE budget_categories
    drop constraint if exists fk_budget_category;

ALTER TABLE budget_categories
    ALTER COLUMN category_id DROP DEFAULT,
    ALTER COLUMN category_id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN category_id SET DEFAULT uuid_generate_v4();



ALTER TABLE category
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE category
    ALTER COLUMN parent_id DROP DEFAULT,
    ALTER COLUMN parent_id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN parent_id SET DEFAULT uuid_generate_v4();
ALTER TABLE category
    add constraint fk_category foreign key (parent_id) references category;


ALTER TABLE transaction
    alter column category_id SET DATA TYPE UUID USING uuid_generate_v4();


--Category


ALTER TABLE transaction
    add constraint fk_category foreign key (category_id) references category;
ALTER TABLE category
    drop constraint if exists fk_category_parent;
ALTER TABLE category
    add constraint fk_category_parent foreign key (parent_id) references category;


ALTER TABLE budget_categories
    add constraint fk_budget_category foreign key (category_id) references category;

ALTER TABLE budget_categories
    drop constraint if exists fk_budget;
ALTER TABLE budget_categories
    ALTER COLUMN budget_id DROP DEFAULT,
    ALTER COLUMN budget_id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN budget_id SET DEFAULT uuid_generate_v4();

ALTER TABLE budget
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE budget_categories
    add constraint fk_budget foreign key (budget_id) references budget;






