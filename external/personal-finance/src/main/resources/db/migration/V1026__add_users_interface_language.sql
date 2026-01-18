ALTER TABLE users
    ADD COLUMN interface_language VARCHAR(10);

UPDATE users SET interface_language = 'en' WHERE interface_language IS NULL;
