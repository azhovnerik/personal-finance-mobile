ALTER TABLE category ADD COLUMN IF NOT EXISTS icon varchar(50);
ALTER TABLE category ADD COLUMN IF NOT EXISTS category_template_id uuid;
ALTER TABLE category ADD CONSTRAINT fk_category_template FOREIGN KEY (category_template_id) REFERENCES category_template (id);
