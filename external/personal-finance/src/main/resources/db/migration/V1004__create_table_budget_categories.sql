create table budget_categories
(
    id          int8         not null,
    budget_id   int8         not null,
    category_id int8         not null,
    type        varchar(255) not null,
    amount      float8       not null,
    comment     varchar(255),
    primary key (id)
);

CREATE INDEX budget_categories_budget_id
    ON budget_categories (budget_id);
CREATE INDEX budget_categories_category_id
    ON budget_categories (category_id);

ALTER TABLE budget_categories
    add constraint fk_budget_category foreign key (category_id) references category;
ALTER TABLE budget_categories
    add constraint fk_budget foreign key (budget_id) references budget;
