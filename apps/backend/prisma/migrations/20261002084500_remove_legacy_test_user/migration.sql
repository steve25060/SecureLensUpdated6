-- Remove the legacy production test account introduced by the 20260726 migration.
-- Demo auth is now disabled in production unless explicitly enabled.
DELETE FROM "users"
WHERE "id" = 'test-user-1'
   OR "email" = 'test@securelens.com';
