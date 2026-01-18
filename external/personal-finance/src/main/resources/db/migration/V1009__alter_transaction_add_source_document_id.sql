ALTER TABLE transaction
    ADD COLUMN change_balance_id int8;
ALTER TABLE transaction
    ADD COLUMN type  varchar(255);
ALTER TABLE transaction
    ADD COLUMN direction  varchar(255);

ALTER TABLE transaction
    add constraint fk_change_balance foreign key (change_balance_id) references change_balance;

UPDATE transaction AS tr
SET direction = CASE WHEN c.type = 'INCOME' THEN 'INCREASE' ELSE 'DECREASE' END  FROM category c
WHERE tr.category_id = c.id ;

ALTER TABLE transaction
    ALTER COLUMN direction SET NOT NULL;

UPDATE transaction AS tr
SET type = CASE WHEN c.type = 'INCOME' THEN 'INCOME' ELSE 'EXPENSE' END  FROM category c
WHERE tr.category_id = c.id ;

ALTER TABLE transaction
    ALTER COLUMN type SET NOT NULL;
