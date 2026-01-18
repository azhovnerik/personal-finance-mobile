ALTER TABLE category
    add constraint fk_category foreign key (parent_id) references category;
