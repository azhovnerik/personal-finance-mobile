DELETE FROM onboarding_state a
USING onboarding_state b
WHERE a.user_id = b.user_id
  AND a.id > b.id;
