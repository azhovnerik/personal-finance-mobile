UPDATE users
SET email = lower('legacy-' || id::text || '@placeholder.local')
WHERE email IS NULL;

ALTER TABLE users
    ALTER COLUMN email SET NOT NULL;
